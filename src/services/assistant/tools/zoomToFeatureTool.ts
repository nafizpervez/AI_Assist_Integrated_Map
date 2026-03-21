import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";

import type {
  AssistantExecutionContext,
  AssistantToolArgs,
  AssistantToolResult,
  ZoomToFeatureArgs,
} from "../toolTypes";

import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
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

  return layer.fields?.find((field) => field.type === "oid")?.name ?? "OBJECTID";
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

function resolveLayerAndObjectIds(
  args: ZoomToFeatureArgs,
  session: AssistantExecutionContext["session"]
): { layerId?: string; objectIds: number[] } {
  let layerId = args.layerId;
  let objectIds: number[] = [];

  if (
    args.source === "lastQueryResult" ||
    args.source === "largestFromLastQueryResult"
  ) {
    layerId = session.lastSelectedFeature?.layerId ?? session.lastQueryResult?.layerId;
    objectIds =
      session.lastSelectedFeature?.objectIds ??
      session.lastQueryResult?.objectIds ??
      [];
  } else if (typeof args.objectId === "number") {
    objectIds = [args.objectId];
  }

  return { layerId, objectIds };
}

export async function zoomToFeatureTool(
  rawArgs: AssistantToolArgs,
  context: AssistantExecutionContext,
  _previousResults: AssistantToolResult[]
): Promise<Omit<AssistantToolResult, "tool" | "success">> {
  const args = rawArgs as ZoomToFeatureArgs;
  const { map, view, session } = context;

  if (!map || !view) {
    return {
      message: "Map view is not ready yet.",
      data: null,
    };
  }

  const resolved = resolveLayerAndObjectIds(args, session);
  const layerId = resolved.layerId;
  const objectIds = resolved.objectIds;

  if (!layerId) {
    return {
      message: "No layer was provided for zoom.",
      data: null,
    };
  }

  const candidate = getFeatureLayerById(map, layerId);

  if (!candidate || !isFeatureLayer(candidate)) {
    return {
      message: `Could not find the "${layerId}" layer for zoom.`,
      data: null,
    };
  }

  if (!objectIds.length) {
    return {
      message: "There are no matched features available to zoom to.",
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
      return {
        message: "No features were found for zoom.",
        data: null,
      };
    }

    if (args.source === "largestFromLastQueryResult") {
      const largest = findLargestFeature(features, objectIdField);

      if (!largest) {
        return {
          message: "Could not determine the largest matched feature for zoom.",
          data: null,
        };
      }

      await view.goTo(largest.feature, {
        duration: 900,
      });

      session.lastSelectedFeature = {
        layerId,
        objectIds: [largest.objectId],
      };

      return {
        message: "Zoomed to the largest matched feature.",
        data: {
          layerId,
          objectIds: [largest.objectId],
          count: 1,
        },
      };
    }

    await view.goTo(features, {
      duration: 900,
    });

    session.lastSelectedFeature = {
      layerId,
      objectIds,
    };

    return {
      message: `Zoomed to ${features.length} matched feature(s).`,
      data: {
        layerId,
        objectIds,
        count: features.length,
      },
    };
  } catch (error) {
    console.error("zoomToFeatureTool failed:", error);

    return {
      message: `Failed to zoom to features in "${layerId}".`,
      data: null,
    };
  }
}