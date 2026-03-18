import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";

import type {
  AdminLevel,
  GraphicWithSourceLayer,
  PopulationExtreme,
  QuerySpatialRelationship,
} from "./types";

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView";
import type Geometry from "@arcgis/core/geometry/Geometry";
import type Graphic from "@arcgis/core/Graphic";
import type Map from "@arcgis/core/Map";
import type MapView from "@arcgis/core/views/MapView";
import { normalizePlaceName } from "./textUtils";

export function attachFeatureContext(
  feature: Graphic,
  layer: FeatureLayer
): GraphicWithSourceLayer {
  const enrichedFeature = feature as GraphicWithSourceLayer;

  enrichedFeature.sourceLayer = layer;
  enrichedFeature.popupTemplate = layer.popupTemplate ?? feature.popupTemplate;

  return enrichedFeature;
}

export function getObjectIdFieldName(layer: FeatureLayer): string | null {
  if (layer.objectIdField) {
    return layer.objectIdField;
  }

  const oidField = layer.fields?.find((field) => field.type === "oid");
  return oidField?.name ?? null;
}

export function getFeatureObjectId(
  feature: Graphic,
  layer: FeatureLayer
): number | null {
  const objectIdField = getObjectIdFieldName(layer);

  if (!objectIdField || !feature.attributes) {
    return null;
  }

  const rawValue = feature.attributes[objectIdField];

  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  const numericValue = Number(rawValue);

  return Number.isFinite(numericValue) ? numericValue : null;
}

export function getFeatureObjectIds(
  features: Graphic[],
  layer: FeatureLayer
): number[] {
  return features
    .map((feature) => getFeatureObjectId(feature, layer))
    .filter((value): value is number => value !== null);
}

export function setLayerFilterByObjectIds(
  layer: FeatureLayer,
  objectIds: number[]
): void {
  const objectIdField = getObjectIdFieldName(layer);

  if (!objectIdField) {
    return;
  }

  if (!objectIds.length) {
    layer.definitionExpression = "1 = 0";
    return;
  }

  layer.definitionExpression = `${objectIdField} IN (${objectIds.join(",")})`;
}

export async function waitForLayerViewReady(
  view: MapView,
  layer: FeatureLayer
): Promise<FeatureLayerView> {
  const layerView = (await view.whenLayerView(layer)) as FeatureLayerView;

  await reactiveUtils.whenOnce(() => !view.updating);
  await reactiveUtils.whenOnce(() => !layerView.updating);

  return layerView;
}

export async function getPopupFeatureFromLayer(
  layer: FeatureLayer,
  sourceFeature: Graphic,
  view: MapView
): Promise<Graphic> {
  const objectId = getFeatureObjectId(sourceFeature, layer);

  if (objectId === null) {
    return attachFeatureContext(sourceFeature, layer);
  }

  const query = layer.createQuery();
  query.objectIds = [objectId];
  query.outFields = ["*"];
  query.returnGeometry = true;
  query.outSpatialReference = view.spatialReference;

  const result = await layer.queryFeatures(query);
  const freshFeature = result.features[0] ?? sourceFeature;

  return attachFeatureContext(freshFeature, layer);
}

export async function searchFeatureByField(
  layer: FeatureLayer,
  fieldName: string,
  targetName: string
): Promise<Graphic | null> {
  await layer.load();

  const query = layer.createQuery();
  query.where = "1=1";
  query.outFields = ["*"];
  query.returnGeometry = true;

  const featureSet = await layer.queryFeatures(query);
  const normalizedTarget = normalizePlaceName(targetName);

  const matchedFeature =
    featureSet.features.find((feature) => {
      const rawValue = feature.attributes?.[fieldName];
      const candidate = normalizePlaceName(String(rawValue ?? ""));
      return candidate === normalizedTarget;
    }) ?? null;

  return matchedFeature ? attachFeatureContext(matchedFeature, layer) : null;
}

export async function searchFeatureByFields(
  layer: FeatureLayer,
  fieldNames: string[],
  targetName: string
): Promise<Graphic | null> {
  for (const fieldName of fieldNames) {
    const matchedFeature = await searchFeatureByField(
      layer,
      fieldName,
      targetName
    );

    if (matchedFeature) {
      return matchedFeature;
    }
  }

  return null;
}

export async function searchExtremeFeatureByNumericField(
  layer: FeatureLayer,
  fieldName: string,
  extreme: PopulationExtreme
): Promise<Graphic | null> {
  await layer.load();

  const query = layer.createQuery();
  query.where = "1=1";
  query.outFields = ["*"];
  query.returnGeometry = true;

  const featureSet = await layer.queryFeatures(query);

  const validFeatures = featureSet.features.filter((feature) => {
    const rawValue = feature.attributes?.[fieldName];
    const numericValue = Number(rawValue);

    return feature.geometry && Number.isFinite(numericValue);
  });

  if (!validFeatures.length) {
    return null;
  }

  const selectedFeature = validFeatures.reduce((best, current) => {
    const bestValue = Number(best.attributes?.[fieldName]);
    const currentValue = Number(current.attributes?.[fieldName]);

    if (extreme === "highest") {
      return currentValue > bestValue ? current : best;
    }

    return currentValue < bestValue ? current : best;
  });

  return attachFeatureContext(selectedFeature, layer);
}

export function getFeatureLayerById(
  map: Map,
  layerId: string
): FeatureLayer | null {
  const layer = map.layers.find((item) => item.id === layerId);
  return layer instanceof FeatureLayer ? layer : null;
}

export function getDistrictLayer(map: Map): FeatureLayer | null {
  return getFeatureLayerById(map, "district");
}

export function getDivisionLayer(map: Map): FeatureLayer | null {
  return getFeatureLayerById(map, "division");
}

export function getUpazilaLayer(map: Map): FeatureLayer | null {
  return getFeatureLayerById(map, "upazila");
}

export async function findAdministrativeFeature(
  map: Map,
  areaType: AdminLevel,
  areaName: string
): Promise<{ feature: Graphic; layer: FeatureLayer } | null> {
  if (areaType === "division") {
    const layer = getDivisionLayer(map);

    if (!layer) {
      return null;
    }

    const feature = await searchFeatureByField(layer, "name_1", areaName);
    return feature ? { feature, layer } : null;
  }

  if (areaType === "district") {
    const layer = getDistrictLayer(map);

    if (!layer) {
      return null;
    }

    const feature = await searchFeatureByField(layer, "name_2", areaName);
    return feature ? { feature, layer } : null;
  }

  const layer = getUpazilaLayer(map);

  if (!layer) {
    return null;
  }

  const feature = await searchFeatureByFields(
    layer,
    ["name_3", "upazila_name", "upazila", "name", "name_en"],
    areaName
  );

  return feature ? { feature, layer } : null;
}

export async function queryFeaturesByGeometry(
  layer: FeatureLayer,
  geometry: Geometry,
  spatialRelationship: QuerySpatialRelationship
): Promise<Graphic[]> {
  await layer.load();

  const query = layer.createQuery();
  query.geometry = geometry;
  query.outFields = ["*"];
  query.returnGeometry = true;
  query.spatialRelationship = spatialRelationship as never;

  const featureSet = await layer.queryFeatures(query);

  return featureSet.features.map((feature) => attachFeatureContext(feature, layer));
}