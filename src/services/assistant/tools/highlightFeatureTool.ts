import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";

import type {
  AssistantExecutionContext,
  AssistantToolArgs,
  AssistantToolResult,
  HighlightFeatureArgs,
} from "../toolTypes";

import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView";
import type Graphic from "@arcgis/core/Graphic";
import type Layer from "@arcgis/core/layers/Layer";
import { getFeatureLayerById } from "../../arcgis/query/featureSearch";

function isFeatureLayer(layer: Layer | null | undefined): layer is FeatureLayer {
  return !!layer && layer.type === "feature";
}

function getObjectIdFieldName(layer: FeatureLayer): string {
  if (layer.objectIdField?.trim()) {
    return layer.objectIdField;
  }

  return (
    layer.fields?.find((field) => field.type === "oid")?.name ?? "OBJECTID"
  );
}

function getGraphicObjectId(
  feature: Graphic,
  objectIdField: string
): number | null {
  const raw = feature.attributes?.[objectIdField];

  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }

  if (typeof raw === "string" && raw.trim() !== "") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getFeatureArea(feature: Graphic): number {
  const geometry = feature.geometry;

  if (!geometry) {
    return 0;
  }

  try {
    if (geometry.type === "polygon") {
      const geodesic = geometryEngine.geodesicArea(
        geometry,
        "square-kilometers"
      );

      if (typeof geodesic === "number" && Number.isFinite(geodesic)) {
        return Math.abs(geodesic);
      }

      const planar = geometryEngine.planarArea(
        geometry,
        "square-kilometers"
      );

      if (typeof planar === "number" && Number.isFinite(planar)) {
        return Math.abs(planar);
      }
    }

    if (geometry.extent) {
      const width = Math.abs(geometry.extent.width ?? 0);
      const height = Math.abs(geometry.extent.height ?? 0);
      return width * height;
    }
  } catch (error) {
    console.warn("Failed to compute feature area:", error);
  }

  return 0;
}

function findLargestFeature(
  features: Graphic[],
  objectIdField: string
): { feature: Graphic; objectId: number } | null {
  let bestFeature: Graphic | null = null;
  let bestObjectId: number | null = null;
  let bestArea = -1;

  for (const feature of features) {
    const objectId = getGraphicObjectId(feature, objectIdField);

    if (objectId === null) {
      continue;
    }

    const area = getFeatureArea(feature);

    if (area > bestArea) {
      bestArea = area;
      bestFeature = feature;
      bestObjectId = objectId;
    }
  }

  if (!bestFeature || bestObjectId === null) {
    return null;
  }

  return {
    feature: bestFeature,
    objectId: bestObjectId,
  };
}

export async function highlightFeatureTool(
  rawArgs: AssistantToolArgs,
  context: AssistantExecutionContext,
  _previousResults: AssistantToolResult[]
): Promise<Omit<AssistantToolResult, "tool" | "success">> {
  const args = rawArgs as HighlightFeatureArgs;
  const { map, view, session } = context;

  if (!map || !view) {
    return {
      message: "Map view is not ready yet.",
      data: null,
    };
  }

  let layerId = args.layerId;
  let objectIds: number[] = [];

  if (args.source === "lastQueryResult") {
    layerId = session.lastQueryResult?.layerId;
    objectIds = session.lastQueryResult?.objectIds ?? [];
  } else if (args.source === "largestFromLastQueryResult") {
    layerId = session.lastQueryResult?.layerId;
    objectIds = session.lastQueryResult?.objectIds ?? [];
  } else if (typeof args.objectId === "number") {
    objectIds = [args.objectId];
  }

  if (!layerId) {
    return {
      message: "No layer was provided for highlight.",
      data: null,
    };
  }

  const candidate = getFeatureLayerById(map, layerId);

  if (!candidate || !isFeatureLayer(candidate)) {
    return {
      message: `Could not find the "${layerId}" layer for highlight.`,
      data: null,
    };
  }

  if (!objectIds.length) {
    if (session.activeHighlightHandle) {
      session.activeHighlightHandle.remove();
      session.activeHighlightHandle = null;
    }

    return {
      message: "There are no matched features available to highlight.",
      data: null,
    };
  }

  try {
    await candidate.load();

    const objectIdField = getObjectIdFieldName(candidate);
    const query = candidate.createQuery();
    query.where = `${objectIdField} IN (${objectIds.join(",")})`;
    query.returnGeometry = true;
    query.outFields = ["*"];

    const result = await candidate.queryFeatures(query);
    const features = result.features ?? [];

    if (!features.length) {
      if (session.activeHighlightHandle) {
        session.activeHighlightHandle.remove();
        session.activeHighlightHandle = null;
      }

      return {
        message: "No features were found for highlight.",
        data: null,
      };
    }

    let highlightIds = objectIds;
    let popupFeatures = features;

    if (args.source === "largestFromLastQueryResult") {
      const largest = findLargestFeature(features, objectIdField);

      if (!largest) {
        return {
          message: "Could not determine the largest matched feature for highlight.",
          data: null,
        };
      }

      highlightIds = [largest.objectId];
      popupFeatures = [largest.feature];
    }

    if (session.activeHighlightHandle) {
      session.activeHighlightHandle.remove();
      session.activeHighlightHandle = null;
    }

    const layerView = (await view.whenLayerView(candidate)) as FeatureLayerView;
    const highlightHandle = layerView.highlight(highlightIds);

    session.activeHighlightHandle = highlightHandle;
    session.lastSelectedFeature = {
      layerId,
      objectIds: highlightIds,
    };

    await view.openPopup({
      features: popupFeatures,
    });

    return {
      message:
        args.source === "largestFromLastQueryResult"
          ? "Highlighted the largest matched feature."
          : `Highlighted ${popupFeatures.length} matched feature(s).`,
      data: {
        layerId,
        objectIds: highlightIds,
        count: popupFeatures.length,
      },
    };
  } catch (error) {
    console.error("highlightFeatureTool failed:", error);

    return {
      message: `Failed to highlight features in "${layerId}".`,
      data: null,
    };
  }
}