import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";

import type {
  AssistantExecutionContext,
  AssistantToolArgs,
  AssistantToolResult,
  FindNearestFeatureArgs,
} from "../toolTypes";
import {
  getFeatureDisplayLabel,
  getFeatureLayerById,
  queryAllFeatures,
} from "../../arcgis/query/featureSearch";

import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView";
import type Graphic from "@arcgis/core/Graphic";
import type MapView from "@arcgis/core/views/MapView";
import Point from "@arcgis/core/geometry/Point";

function getReferencePoint(context: AssistantExecutionContext): Point | null {
  const { session, view } = context;

  if (session.lastClickedPoint) {
    return new Point({
      longitude: session.lastClickedPoint.longitude,
      latitude: session.lastClickedPoint.latitude,
      spatialReference: { wkid: 4326 },
    });
  }

  if (view?.center) {
    return view.center.clone();
  }

  return null;
}

function getCandidatePoint(feature: Graphic): Point | null {
  const geometry = feature.geometry;

  if (!geometry) {
    return null;
  }

  if (geometry.type === "point") {
    return geometry as Point;
  }

  if ("centroid" in geometry && geometry.centroid) {
    return geometry.centroid;
  }

  if ("extent" in geometry && geometry.extent) {
    return geometry.extent.center;
  }

  return null;
}

function formatDistance(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "N/A";
  }

  return `${value.toFixed(2)} km`;
}

async function applyHighlight(
  view: MapView,
  layer: FeatureLayer,
  graphic: Graphic,
  session: AssistantExecutionContext["session"]
): Promise<void> {
  const objectIdField =
    layer.objectIdField ||
    layer.fields?.find((field) => field.type === "oid")?.name;

  const objectId = objectIdField ? Number(graphic.attributes?.[objectIdField]) : NaN;

  if (session.activeHighlightHandle) {
    session.activeHighlightHandle.remove();
    session.activeHighlightHandle = null;
  }

  if (Number.isFinite(objectId)) {
    const layerView = (await view.whenLayerView(layer)) as FeatureLayerView;
    session.activeHighlightHandle = layerView.highlight([objectId]);
  }
}

export async function findNearestFeatureTool(
  rawArgs: AssistantToolArgs,
  context: AssistantExecutionContext,
  _previousResults: AssistantToolResult[]
): Promise<Omit<AssistantToolResult, "tool" | "success">> {
  const args = rawArgs as FindNearestFeatureArgs;
  const { map, view } = context;

  if (!map || !view) {
    return {
      message: "Map view is not ready yet.",
      data: null,
    };
  }

  const layer = getFeatureLayerById(map, args.layerId);

  if (!layer) {
    return {
      message: `Could not find the "${args.layerId}" layer.`,
      data: null,
    };
  }

  const referencePoint = getReferencePoint(context);

  if (!referencePoint) {
    return {
      message: "No map reference point is available yet. Click the map first or move the map.",
      data: null,
    };
  }

  try {
    await layer.load();
    layer.visible = true;

    const features = await queryAllFeatures(layer);

    let bestFeature: Graphic | null = null;
    let bestDistance: number | null = null;

    for (const feature of features) {
      const candidatePoint = getCandidatePoint(feature);

      if (!candidatePoint) {
        continue;
      }

      const distance = geometryEngine.distance(
        referencePoint,
        candidatePoint,
        "kilometers"
      );

      if (distance === null || !Number.isFinite(distance)) {
        continue;
      }

      if (bestDistance === null || distance < bestDistance) {
        bestDistance = distance;
        bestFeature = feature;
      }
    }

    if (!bestFeature || bestDistance === null) {
      return {
        message: `No nearby feature could be determined from the "${layer.title}" layer.`,
        data: null,
      };
    }

    await view.goTo(bestFeature);
    await applyHighlight(view, layer, bestFeature, context.session);
    await view.openPopup({
      features: [bestFeature],
    });

    const label = getFeatureDisplayLabel(bestFeature);

    return {
      message: [
        `The nearest feature was found in ${layer.title}.`,
        "",
        `Layer: ${layer.title}`,
        `Nearest Feature: ${label}`,
        `Distance: ${formatDistance(bestDistance)}`,
      ].join("\n"),
      data: {
        layerId: layer.id,
        title: layer.title,
        label,
        distanceKm: bestDistance,
      },
    };
  } catch (error) {
    console.error("findNearestFeatureTool failed:", error);

    return {
      message: `Failed to find the nearest feature in "${layer.title}".`,
      data: null,
    };
  }
}