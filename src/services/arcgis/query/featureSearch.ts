import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";

import type { GraphicWithSourceLayer, PopulationExtreme } from "./types";

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView";
import type Graphic from "@arcgis/core/Graphic";
import type Map from "@arcgis/core/Map";
import type MapView from "@arcgis/core/views/MapView";
import { normalizeText } from "./textUtils";

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

  const matchedFeature =
    featureSet.features.find((feature) => {
      const rawValue = feature.attributes?.[fieldName];
      const candidate = normalizeText(String(rawValue ?? ""));
      return candidate === targetName;
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

export function getDistrictLayer(map: Map): FeatureLayer | null {
  const layer = map.layers.find((item) => item.id === "district");
  return layer instanceof FeatureLayer ? layer : null;
}

export function getDivisionLayer(map: Map): FeatureLayer | null {
  const layer = map.layers.find((item) => item.id === "division");
  return layer instanceof FeatureLayer ? layer : null;
}

export function getUpazilaLayer(map: Map): FeatureLayer | null {
  const layer = map.layers.find((item) => item.id === "upazila");
  return layer instanceof FeatureLayer ? layer : null;
}