import type {
  AssistantExecutionContext,
  AssistantQueryResultData,
  AssistantQueryRow,
  AssistantToolArgs,
  AssistantToolResult,
  ZoomToBangladeshArgs,
} from "../toolTypes";
import {
  getFeatureObjectIds,
  queryAllFeatures,
} from "../../arcgis/query/featureSearch";

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Graphic from "@arcgis/core/Graphic";
import type Layer from "@arcgis/core/layers/Layer";
import type Map from "@arcgis/core/Map";

function getBoundaryLayer(map: Map): FeatureLayer | null {
  const layer = map.allLayers.find(
    (item: Layer) => item.id === "bd-boundary"
  );

  return layer instanceof FeatureLayer ? layer : null;
}

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

function buildFullLayerResult(
  layer: FeatureLayer,
  features: Graphic[]
): AssistantQueryResultData {
  const rows = features.map(toRow);
  const columns =
    rows[0] != null
      ? Object.keys(rows[0])
      : layer.fields?.map((field) => field.name).filter(Boolean) ?? [];

  return {
    layerId: layer.id,
    title: layer.title || layer.id,
    columns,
    rows,
    totalCount: rows.length,
    objectIds: getFeatureObjectIds(features, layer),
  };
}

export async function zoomToBangladeshTool(
  rawArgs: AssistantToolArgs,
  context: AssistantExecutionContext,
  _previousResults: AssistantToolResult[]
): Promise<Omit<AssistantToolResult, "tool" | "success">> {
  const args = rawArgs as ZoomToBangladeshArgs;
  const { map, view, session } = context;

  if (!map || !view) {
    return {
      message: "Map view is not ready yet.",
      data: null,
    };
  }

  try {
    const boundaryLayer = getBoundaryLayer(map);

    if (boundaryLayer) {
      await boundaryLayer.load();

      if (args.includeBoundaryLayer !== false) {
        boundaryLayer.visible = true;
      }

      const allBoundaryFeatures = await queryAllFeatures(boundaryLayer);
      const fullLayerResult = buildFullLayerResult(
        boundaryLayer,
        allBoundaryFeatures
      );

      session.lastQueryResult = fullLayerResult;
      session.lastMultiLayerQueryResult = {
        scopeName: "Bangladesh Boundary",
        scopeLayerId: fullLayerResult.layerId,
        items: [
          {
            layerId: fullLayerResult.layerId,
            title: fullLayerResult.title,
            totalCount: fullLayerResult.totalCount,
            objectIds: fullLayerResult.objectIds,
            columns: fullLayerResult.columns,
            rows: fullLayerResult.rows,
          },
        ],
        totalLayerCount: 1,
        totalFeatureCount: fullLayerResult.totalCount,
      };
      session.lastSelectedFeature = {
        layerId: fullLayerResult.layerId,
        objectIds: fullLayerResult.objectIds,
      };

      const extentResult = await boundaryLayer.queryExtent({
        where: "1=1",
      });

      if (extentResult.extent) {
        await view.goTo(extentResult.extent.expand(1.1));

        return {
          message: "Zoomed to Bangladesh. Full attribute table for Bangladesh Boundary is ready.",
          data: fullLayerResult,
        };
      }

      await view.goTo({
        center: [90.3563, 23.685],
        zoom: 6,
      });

      return {
        message: "Zoomed to Bangladesh. Full attribute table for Bangladesh Boundary is ready.",
        data: fullLayerResult,
      };
    }

    session.lastSelectedFeature = null;
    session.lastQueryResult = null;
    session.lastMultiLayerQueryResult = null;

    await view.goTo({
      center: [90.3563, 23.685],
      zoom: 6,
    });

    return {
      message: "Zoomed to Bangladesh.",
      data: {
        center: [90.3563, 23.685],
        zoom: 6,
      },
    };
  } catch (error) {
    console.error("zoomToBangladeshTool failed:", error);

    session.lastQueryResult = null;
    session.lastMultiLayerQueryResult = null;
    session.lastSelectedFeature = null;

    return {
      message: "Failed to zoom to Bangladesh.",
      data: null,
    };
  }
}