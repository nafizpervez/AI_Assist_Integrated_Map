import * as webMercatorUtils from "@arcgis/core/geometry/support/webMercatorUtils";

import type {
  AssistantExecutionContext,
  AssistantToolArgs,
  AssistantToolResult,
  FindNearestFeatureArgs,
} from "../toolTypes";
import {
  execute as executeGeodeticDistance,
  isLoaded as isGeodeticDistanceLoaded,
  load as loadGeodeticDistance,
} from "@arcgis/core/geometry/operators/geodeticDistanceOperator";
import {
  findAdministrativeFeature,
  getFeatureDisplayLabel,
  getFeatureLayerById,
  getFeatureObjectIds,
  queryAllFeatures,
  queryFeaturesByGeometry,
  setAdministrativeLayerVisibility,
  setLayerFilterByObjectIds,
} from "../../arcgis/query/featureSearch";

import type { AdminLevel } from "../../arcgis/query/types";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView";
import Graphic from "@arcgis/core/Graphic";
import type GraphicType from "@arcgis/core/Graphic";
import type Layer from "@arcgis/core/layers/Layer";
import type Map from "@arcgis/core/Map";
import type MapView from "@arcgis/core/views/MapView";
import Point from "@arcgis/core/geometry/Point";
import type Polygon from "@arcgis/core/geometry/Polygon";
import type Polyline from "@arcgis/core/geometry/Polyline";
import { normalizePlaceName } from "../../arcgis/query/textUtils";

const DEFAULT_ADMIN_TYPES: AdminLevel[] = [
  "division",
  "district",
  "upazila",
];

const SCOPE_HIGHLIGHT_GRAPHIC_ID = "__assistant_scope_highlight__";

function stripAdministrativeSuffix(value: string): string {
  return value
    .trim()
    .replace(/\b(division|district|upazila|thana|bibhag|zila)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isFeatureLayer(layer: Layer | null | undefined): layer is FeatureLayer {
  return !!layer && layer.type === "feature";
}

function getOperationalLayers(map: Map): Layer[] {
  return map.layers.toArray();
}

function isHighwayLayerId(layerId: string): boolean {
  const normalized = layerId.trim().toLowerCase();

  return (
    normalized.includes("national") ||
    normalized.includes("regional") ||
    normalized.includes("highway")
  );
}

function getScopedTargetLayers(map: Map, targetLayerId: string): FeatureLayer[] {
  const operationalLayers = getOperationalLayers(map);

  if (!isHighwayLayerId(targetLayerId)) {
    const singleLayer = getFeatureLayerById(map, targetLayerId);
    return singleLayer ? [singleLayer] : [];
  }

  return operationalLayers.filter((layer): layer is FeatureLayer => {
    if (!isFeatureLayer(layer)) {
      return false;
    }

    const idText = layer.id.toLowerCase();
    const titleText = (layer.title || "").toLowerCase();

    return (
      idText.includes("national") ||
      idText.includes("regional") ||
      titleText.includes("national highway") ||
      titleText.includes("regional highway")
    );
  });
}

function clearAllOperationalDefinitionExpressions(map: Map): void {
  getOperationalLayers(map).forEach((layer: Layer) => {
    if (isFeatureLayer(layer) && layer.definitionExpression) {
      layer.definitionExpression = "";
    }
  });
}

function setNearestScopedVisibility(
  map: Map,
  targetLayerIds: string[],
  adminLayerId?: string
): void {
  const keepVisible = new Set<string>(["bd-boundary", ...targetLayerIds]);

  if (adminLayerId) {
    keepVisible.add(adminLayerId);
  }

  getOperationalLayers(map).forEach((layer: Layer) => {
    layer.visible = keepVisible.has(layer.id);
  });
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

function createScopeHighlightGraphic(feature: GraphicType): Graphic | null {
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
        color: [0, 255, 255, 1],
        width: 3,
      },
    });
  }

  return null;
}

function getPointFromGeometry(graphic: GraphicType): Point | null {
  const geometry = graphic.geometry;

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

async function getReferenceArea(
  context: AssistantExecutionContext,
  args: FindNearestFeatureArgs
): Promise<{
  areaType: AdminLevel;
  feature: GraphicType;
  layer: FeatureLayer;
  point: Point;
  sourceLabel: string;
} | null> {
  const { map } = context;

  if (!args.targetName || !map) {
    return null;
  }

  const cleanedTarget = stripAdministrativeSuffix(args.targetName);
  const normalizedTarget = normalizePlaceName(cleanedTarget);

  const preferredTypes: AdminLevel[] =
    args.preferredAdminTypes && args.preferredAdminTypes.length
      ? [...args.preferredAdminTypes]
      : DEFAULT_ADMIN_TYPES;

  for (const areaType of preferredTypes) {
    const matched = await findAdministrativeFeature(
      map,
      areaType,
      normalizedTarget
    );

    if (!matched) {
      continue;
    }

    const point = getPointFromGeometry(matched.feature);

    if (!point) {
      continue;
    }

    return {
      areaType,
      feature: matched.feature,
      layer: matched.layer,
      point,
      sourceLabel: `${areaType} "${normalizedTarget}"`,
    };
  }

  return null;
}

async function getFallbackReferencePoint(
  context: AssistantExecutionContext,
  args: FindNearestFeatureArgs
): Promise<{ point: Point; sourceLabel: string } | null> {
  const { session, view } = context;

  if (args.useMapPoint !== false && session.lastClickedPoint) {
    return {
      point: new Point({
        longitude: session.lastClickedPoint.longitude,
        latitude: session.lastClickedPoint.latitude,
        spatialReference: { wkid: 4326 },
      }),
      sourceLabel: "the selected map point",
    };
  }

  if (args.useMapPoint !== false && view?.center) {
    return {
      point: view.center.clone(),
      sourceLabel: "the current map center",
    };
  }

  return null;
}

function getCandidatePoint(feature: GraphicType): Point | null {
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

function normalizePointForDistance(point: Point): Point {
  if (point.spatialReference?.isWGS84) {
    return point;
  }

  if (point.spatialReference?.isWebMercator) {
    return webMercatorUtils.webMercatorToGeographic(point) as Point;
  }

  return point;
}

async function getDistanceInKm(
  fromPoint: Point,
  toPoint: Point
): Promise<number | null> {
  const from = normalizePointForDistance(fromPoint);
  const to = normalizePointForDistance(toPoint);

  if (!from || !to) {
    return null;
  }

  if (!isGeodeticDistanceLoaded()) {
    await loadGeodeticDistance();
  }

  const distance = executeGeodeticDistance(from, to, {
    unit: "kilometers",
    curveType: "geodesic",
  });

  return Number.isFinite(distance) ? distance : null;
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
  graphic: GraphicType,
  session: AssistantExecutionContext["session"]
): Promise<void> {
  const objectIdField =
    layer.objectIdField ||
    layer.fields?.find((field) => field.type === "oid")?.name;

  const objectId = objectIdField
    ? Number(graphic.attributes?.[objectIdField])
    : NaN;

  if (session.activeHighlightHandle) {
    session.activeHighlightHandle.remove();
    session.activeHighlightHandle = null;
  }

  if (Number.isFinite(objectId)) {
    const layerView = (await view.whenLayerView(layer)) as FeatureLayerView;
    session.activeHighlightHandle = layerView.highlight([objectId]);
  }
}

function clearActiveHighlight(
  session: AssistantExecutionContext["session"]
): void {
  if (session.activeHighlightHandle) {
    session.activeHighlightHandle.remove();
    session.activeHighlightHandle = null;
  }
}

function bringLayerToFront(view: MapView, layer: FeatureLayer): void {
  const map = view.map;
  if (!map) return;

  const currentIndex = map.layers.indexOf(layer);
  const topIndex = map.layers.length - 1;

  if (currentIndex >= 0 && currentIndex !== topIndex) {
    map.reorder(layer, topIndex);
  }
}

function getGoToTargetFromGraphic(
  graphic: GraphicType
): Parameters<MapView["goTo"]>[0] | null {
  const geometry = graphic.geometry;

  if (!geometry) {
    return null;
  }

  if (geometry.type === "point") {
    return {
      target: geometry,
      zoom: 12,
    };
  }

  if ("extent" in geometry && geometry.extent) {
    return geometry.extent.clone().expand(1.2);
  }

  return {
    target: geometry,
  };
}

async function safeGoTo(
  view: MapView,
  target: Parameters<MapView["goTo"]>[0]
): Promise<void> {
  await view.when();

  try {
    await view.goTo(target, {
      duration: 1200,
      easing: "ease-in-out",
    });
  } catch (error) {
    const err = error as Error;
    if (err?.name !== "AbortError") {
      throw error;
    }
  }
}

async function zoomToBoundaryScope(
  view: MapView,
  boundaryFeature: GraphicType
): Promise<void> {
  const target = getGoToTargetFromGraphic(boundaryFeature);

  if (!target) {
    return;
  }

  await safeGoTo(view, target);
}

async function zoomToNearestResult(
  view: MapView,
  feature: GraphicType
): Promise<void> {
  const target = getGoToTargetFromGraphic(feature);

  if (!target) {
    return;
  }

  await safeGoTo(view, target);
}

export async function findNearestFeatureTool(
  rawArgs: AssistantToolArgs,
  context: AssistantExecutionContext,
  _previousResults: AssistantToolResult[]
): Promise<Omit<AssistantToolResult, "tool" | "success">> {
  const args = rawArgs as FindNearestFeatureArgs;
  const { map, view, session } = context;

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

  const scopedTargetLayers = getScopedTargetLayers(map, args.layerId);

  if (!scopedTargetLayers.length) {
    return {
      message: `Could not resolve scoped layers for "${args.layerId}".`,
      data: null,
    };
  }

  try {
    await Promise.all(scopedTargetLayers.map((targetLayer) => targetLayer.load()));

    const referenceArea = await getReferenceArea(context, args);

    clearAllOperationalDefinitionExpressions(map);
    removeScopeHighlightGraphic(view);
    clearActiveHighlight(session);

    if (referenceArea) {
      await referenceArea.layer.load();

      setAdministrativeLayerVisibility(map, referenceArea.areaType);
      referenceArea.layer.visible = true;

      scopedTargetLayers.forEach((targetLayer) => {
        targetLayer.visible = true;
      });

      setNearestScopedVisibility(
        map,
        scopedTargetLayers.map((targetLayer) => targetLayer.id),
        referenceArea.layer.id
      );

      bringLayerToFront(view, referenceArea.layer);

      scopedTargetLayers.forEach((targetLayer) => {
        bringLayerToFront(view, targetLayer);
      });

      const scopeGraphic = createScopeHighlightGraphic(referenceArea.feature);
      if (scopeGraphic) {
        view.graphics.add(scopeGraphic);
      }

      const scopedResults = await Promise.all(
        scopedTargetLayers.map(async (targetLayer) => {
          const features = await queryFeaturesByGeometry(
            targetLayer,
            referenceArea.feature.geometry!,
            "intersects"
          );

          const objectIds = getFeatureObjectIds(features, targetLayer);

          return {
            layer: targetLayer,
            features,
            objectIds,
          };
        })
      );

      const totalScopedCount = scopedResults.reduce(
        (sum, result) => sum + result.objectIds.length,
        0
      );

      if (!totalScopedCount) {
        scopedTargetLayers.forEach((targetLayer) => {
          targetLayer.visible = false;
          targetLayer.definitionExpression = "";
        });

        await zoomToBoundaryScope(view, referenceArea.feature);

        return {
          message: `No highway features were found inside ${referenceArea.sourceLabel}.`,
          data: null,
        };
      }

      scopedResults.forEach((result) => {
        if (result.objectIds.length) {
          setLayerFilterByObjectIds(result.layer, result.objectIds);
        } else {
          result.layer.visible = false;
          result.layer.definitionExpression = "";
        }
      });

      let bestFeature: GraphicType | null = null;
      let bestDistance: number | null = null;
      let bestFeatureLayer: FeatureLayer | null = null;

      for (const result of scopedResults) {
        for (const feature of result.features) {
          const candidatePoint = getCandidatePoint(feature);

          if (!candidatePoint) {
            continue;
          }

          const distance = await getDistanceInKm(referenceArea.point, candidatePoint);

          if (distance === null || !Number.isFinite(distance)) {
            continue;
          }

          if (bestDistance === null || distance < bestDistance) {
            bestDistance = distance;
            bestFeature = feature;
            bestFeatureLayer = result.layer;
          }
        }
      }

      await zoomToBoundaryScope(view, referenceArea.feature);

      referenceArea.layer.visible = false;

      if (bestFeature && bestFeatureLayer) {
        const objectIdField =
          bestFeatureLayer.objectIdField ||
          bestFeatureLayer.fields?.find((field) => field.type === "oid")?.name;
        const selectedObjectId =
          objectIdField && bestFeature.attributes?.[objectIdField] != null
            ? Number(bestFeature.attributes[objectIdField])
            : null;

        if (selectedObjectId !== null && Number.isFinite(selectedObjectId)) {
          session.lastSelectedFeature = {
            layerId: bestFeatureLayer.id,
            objectIds: [selectedObjectId],
          };
        }
      }

      const nearestLabel = bestFeature
        ? getFeatureDisplayLabel(bestFeature)
        : null;

      return {
        message: [
          isHighwayLayerId(args.layerId)
            ? `Features were shown from National Highways and Regional Highways inside ${referenceArea.sourceLabel}.`
            : `Features were shown from ${layer.title} inside ${referenceArea.sourceLabel}.`,
          "",
          `Reference: ${referenceArea.sourceLabel}`,
          isHighwayLayerId(args.layerId)
            ? `Layers: National Highways, Regional Highways`
            : `Layer: ${layer.title}`,
          `Visible Features: ${totalScopedCount}`,
          nearestLabel ? `Nearest Feature: ${nearestLabel}` : null,
          bestDistance !== null
            ? `Nearest Distance: ${formatDistance(bestDistance)}`
            : null,
        ]
          .filter(Boolean)
          .join("\n"),
        data: {
          layerId: bestFeatureLayer?.id ?? layer.id,
          title: isHighwayLayerId(args.layerId)
            ? "National Highways + Regional Highways"
            : layer.title,
          reference: referenceArea.sourceLabel,
          visibleCount: totalScopedCount,
          nearestLabel,
          distanceKm: bestDistance,
          objectIds: scopedResults.flatMap((result) => result.objectIds),
        },
      };
    }

    const fallbackReference = await getFallbackReferencePoint(context, args);

    if (!fallbackReference) {
      return {
        message:
          "No usable reference point is available yet. Provide a district/division/upazila, click the map, or move the map.",
        data: null,
      };
    }

    layer.visible = true;
    bringLayerToFront(view, layer);

    const features = await queryAllFeatures(layer);

    let bestFeature: GraphicType | null = null;
    let bestDistance: number | null = null;

    for (const feature of features) {
      const candidatePoint = getCandidatePoint(feature);

      if (!candidatePoint) {
        continue;
      }

      const distance = await getDistanceInKm(
        fallbackReference.point,
        candidatePoint
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

    await zoomToNearestResult(view, bestFeature);
    await applyHighlight(view, layer, bestFeature, session);

    const objectIdField =
      layer.objectIdField ||
      layer.fields?.find((field) => field.type === "oid")?.name;
    const selectedObjectId =
      objectIdField && bestFeature.attributes?.[objectIdField] != null
        ? Number(bestFeature.attributes[objectIdField])
        : null;

    session.lastSelectedFeature = {
      layerId: layer.id,
      objectIds:
        selectedObjectId !== null && Number.isFinite(selectedObjectId)
          ? [selectedObjectId]
          : [],
    };

    const label = getFeatureDisplayLabel(bestFeature);

    return {
      message: [
        `The nearest feature was found in ${layer.title}.`,
        "",
        `Reference: ${fallbackReference.sourceLabel}`,
        `Layer: ${layer.title}`,
        `Nearest Feature: ${label}`,
        `Distance: ${formatDistance(bestDistance)}`,
      ].join("\n"),
      data: {
        layerId: layer.id,
        title: layer.title,
        label,
        distanceKm: bestDistance,
        reference: fallbackReference.sourceLabel,
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