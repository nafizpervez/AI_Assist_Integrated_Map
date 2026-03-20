import type {
  AssistantExecutionContext,
  AssistantQueryResultData,
  AssistantQueryRow,
  AssistantToolArgs,
  AssistantToolResult,
  FindAdministrativeFeatureArgs,
} from "../toolTypes";
import {
  findAdministrativeFeature,
  getFeatureObjectId,
  setAdministrativeLayerVisibility,
} from "../../arcgis/query/featureSearch";
import {
  getGenericSearchPriority,
  normalizePlaceName,
} from "../../arcgis/query/textUtils";

import type { AdminLevel } from "../../arcgis/query/types";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView";
import Graphic from "@arcgis/core/Graphic";
import type MapView from "@arcgis/core/views/MapView";
import type Polygon from "@arcgis/core/geometry/Polygon";
import type Polyline from "@arcgis/core/geometry/Polyline";

const SCOPE_HIGHLIGHT_GRAPHIC_ID = "__assistant_scope_highlight__";

function normalizeTableValue(
  value: unknown
): string | number | boolean | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return String(value);
}

function toRow(feature: Graphic): AssistantQueryRow {
  const attributes = feature.attributes ?? {};
  const row: AssistantQueryRow = {};

  for (const [key, value] of Object.entries(attributes)) {
    row[key] = normalizeTableValue(value);
  }

  return row;
}

function buildSingleFeatureResult(
  layer: FeatureLayer,
  feature: Graphic
): AssistantQueryResultData {
  const row = toRow(feature);
  const objectId = getFeatureObjectId(feature, layer);

  return {
    layerId: layer.id,
    title: layer.title || layer.id,
    columns: Object.keys(row),
    rows: [row],
    totalCount: 1,
    objectIds: objectId !== null ? [objectId] : [],
  };
}

function toAdminLabel(areaType: AdminLevel): string {
  if (areaType === "division") return "Division";
  if (areaType === "district") return "District";
  return "Upazila";
}

function toDisplayName(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function buildScopePopupTitle(targetName: string, areaType: AdminLevel): string {
  return `Scope: ${toDisplayName(targetName)} ${toAdminLabel(areaType)}`;
}

function removeScopeHighlightGraphic(view: MapView): void {
  const graphicsToRemove = view.graphics
    .toArray()
    .filter(
      (graphic) =>
        graphic.attributes?.__assistantGraphicId === SCOPE_HIGHLIGHT_GRAPHIC_ID
    );

  graphicsToRemove.forEach((graphic) => {
    view.graphics.remove(graphic);
  });
}

function createScopeHighlightGraphic(feature: Graphic): Graphic | null {
  const geometry = feature.geometry;

  if (!geometry) {
    return null;
  }

  if (geometry.type === "polygon") {
    return new Graphic({
      geometry: geometry as Polygon,
      attributes: {
        __assistantGraphicId: SCOPE_HIGHLIGHT_GRAPHIC_ID,
      },
      symbol: {
        type: "simple-fill",
        color: [0, 255, 255, 0.1],
        outline: {
          color: [0, 255, 255, 1],
          width: 1,
        },
      },
    });
  }

  if (geometry.type === "polyline") {
    return new Graphic({
      geometry: geometry as Polyline,
      attributes: {
        __assistantGraphicId: SCOPE_HIGHLIGHT_GRAPHIC_ID,
      },
      symbol: {
        type: "simple-line",
        color: [255, 0, 0, 1],
        width: 4,
      },
    });
  }

  return null;
}

function buildPopupFeature(
  feature: Graphic,
  layer: FeatureLayer,
  targetName: string,
  areaType: AdminLevel
): Graphic {
  const popupTitle = buildScopePopupTitle(targetName, areaType);

  return new Graphic({
    geometry: feature.geometry,
    attributes: feature.attributes,
    popupTemplate: {
      title: popupTitle,
      content: [
        {
          type: "fields",
          fieldInfos: layer.fields.map((field) => ({
            fieldName: field.name,
            label: field.alias || field.name,
          })),
        },
      ],
    },
  });
}

export async function findAdministrativeFeatureTool(
  rawArgs: AssistantToolArgs,
  context: AssistantExecutionContext,
  _previousResults: AssistantToolResult[]
): Promise<Omit<AssistantToolResult, "tool" | "success">> {
  const args = rawArgs as FindAdministrativeFeatureArgs;
  const { map, view, session, prompt } = context;

  if (!map || !view) {
    return {
      message: "Map view is not ready yet.",
      data: null,
    };
  }

  const targetName = normalizePlaceName(args.targetName?.trim() ?? "");

  if (!targetName) {
    return {
      message: "No administrative area name was provided.",
      data: null,
    };
  }

  const searchPriority: AdminLevel[] =
    args.preferredTypes && args.preferredTypes.length
      ? [...args.preferredTypes]
      : getGenericSearchPriority(prompt);

  try {
    for (const areaType of searchPriority) {
      const matched = await findAdministrativeFeature(map, areaType, targetName);

      if (!matched) {
        continue;
      }

      setAdministrativeLayerVisibility(map, areaType);
      matched.layer.visible = true;

      const resultData = buildSingleFeatureResult(matched.layer, matched.feature);
      session.lastQueryResult = resultData;
      session.lastSelectedFeature = {
        layerId: resultData.layerId,
        objectIds: resultData.objectIds,
      };

      if (session.activeHighlightHandle) {
        session.activeHighlightHandle.remove();
        session.activeHighlightHandle = null;
      }

      removeScopeHighlightGraphic(view);

      await view.goTo(matched.feature, {
        duration: 900,
      });

      const objectId = resultData.objectIds[0];
      if (typeof objectId === "number" && Number.isFinite(objectId)) {
        const layerView = (await view.whenLayerView(
          matched.layer
        )) as FeatureLayerView;

        session.activeHighlightHandle = layerView.highlight([objectId]);
      }

      const scopeGraphic = createScopeHighlightGraphic(matched.feature);
      if (scopeGraphic) {
        view.graphics.add(scopeGraphic);
      }

      const popupFeature = buildPopupFeature(
        matched.feature,
        matched.layer,
        targetName,
        areaType
      );

      await view.openPopup({
        features: [popupFeature],
      });

      return {
        message: `Found ${toAdminLabel(areaType)}: ${targetName}.`,
        data: resultData,
      };
    }

    return {
      message: `No division, district, or upazila matched "${targetName}".`,
      data: null,
    };
  } catch (error) {
    console.error("findAdministrativeFeatureTool failed:", error);

    return {
      message: "Failed to search the requested administrative area.",
      data: null,
    };
  }
}