import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";

import type {
  AdminLevel,
  GraphicWithSourceLayer,
  PopulationExtreme,
  QuerySpatialRelationship,
} from "./types";
import {
  normalizeMatchValue,
  normalizePlaceName,
  splitPipeAliasTokens,
} from "./textUtils";

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView";
import type Geometry from "@arcgis/core/geometry/Geometry";
import type Graphic from "@arcgis/core/Graphic";
import type Layer from "@arcgis/core/layers/Layer";
import type Map from "@arcgis/core/Map";
import type MapView from "@arcgis/core/views/MapView";
import { similarityScore } from "../../../utils/fuzzy";

const MIN_FUZZY_SCORE = 0.74;

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

export function getAttributeValueCaseInsensitive(
  feature: Graphic,
  fieldNames: string[]
): unknown {
  const attributes = feature.attributes ?? {};

  for (const fieldName of fieldNames) {
    if (fieldName in attributes) {
      return attributes[fieldName];
    }

    const matchedKey = Object.keys(attributes).find(
      (key) => key.toLowerCase() === fieldName.toLowerCase()
    );

    if (matchedKey) {
      return attributes[matchedKey];
    }
  }

  return undefined;
}

export function getAttributeStringCaseInsensitive(
  feature: Graphic,
  fieldNames: string[]
): string {
  const value = getAttributeValueCaseInsensitive(feature, fieldNames);

  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

export async function queryAllFeatures(layer: FeatureLayer): Promise<Graphic[]> {
  await layer.load();

  const query = layer.createQuery();
  query.where = "1=1";
  query.outFields = ["*"];
  query.returnGeometry = true;

  const featureSet = await layer.queryFeatures(query);

  return featureSet.features.map((feature) => attachFeatureContext(feature, layer));
}

function getNormalizedFeatureFieldValue(
  feature: Graphic,
  fieldName: string
): string {
  const rawValue = getAttributeValueCaseInsensitive(feature, [fieldName]);
  return normalizePlaceName(String(rawValue ?? ""));
}

function getNormalizedFeatureFieldValues(
  feature: Graphic,
  fieldNames: string[]
): string[] {
  const values = fieldNames
    .map((fieldName) => getNormalizedFeatureFieldValue(feature, fieldName))
    .filter(Boolean);

  return Array.from(new Set(values));
}

function scoreCandidateAgainstTarget(candidate: string, target: string): number {
  if (!candidate || !target) {
    return 0;
  }

  if (candidate === target) {
    return 1;
  }

  if (candidate.includes(target) || target.includes(candidate)) {
    return 0.92;
  }

  return similarityScore(candidate, target);
}

function findBestFeatureByCandidateStrings(
  features: Graphic[],
  candidateResolver: (feature: Graphic) => string[],
  targetName: string
): Graphic | null {
  const normalizedTarget = normalizePlaceName(targetName);

  if (!normalizedTarget) {
    return null;
  }

  let bestFeature: Graphic | null = null;
  let bestScore = 0;

  for (const feature of features) {
    const candidates = candidateResolver(feature);

    for (const candidate of candidates) {
      const score = scoreCandidateAgainstTarget(candidate, normalizedTarget);

      if (score > bestScore) {
        bestScore = score;
        bestFeature = feature;
      }

      if (score >= 1) {
        return feature;
      }
    }
  }

  return bestScore >= MIN_FUZZY_SCORE ? bestFeature : null;
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
  const features = featureSet.features.map((feature) => attachFeatureContext(feature, layer));
  const normalizedTarget = normalizePlaceName(targetName);

  const exactMatch =
    features.find((feature) => {
      const candidate = getNormalizedFeatureFieldValue(feature, fieldName);
      return candidate === normalizedTarget;
    }) ?? null;

  if (exactMatch) {
    return exactMatch;
  }

  const containsMatch =
    features.find((feature) => {
      const candidate = getNormalizedFeatureFieldValue(feature, fieldName);
      return (
        candidate.includes(normalizedTarget) ||
        normalizedTarget.includes(candidate)
      );
    }) ?? null;

  if (containsMatch) {
    return containsMatch;
  }

  return findBestFeatureByCandidateStrings(
    features,
    (feature) => [getNormalizedFeatureFieldValue(feature, fieldName)],
    targetName
  );
}

export async function searchFeatureByFields(
  layer: FeatureLayer,
  fieldNames: string[],
  targetName: string
): Promise<Graphic | null> {
  await layer.load();

  const features = await queryAllFeatures(layer);
  const normalizedTarget = normalizePlaceName(targetName);

  const exactMatch =
    features.find((feature) => {
      const candidates = getNormalizedFeatureFieldValues(feature, fieldNames);
      return candidates.some((candidate) => candidate === normalizedTarget);
    }) ?? null;

  if (exactMatch) {
    return exactMatch;
  }

  const containsMatch =
    features.find((feature) => {
      const candidates = getNormalizedFeatureFieldValues(feature, fieldNames);
      return candidates.some(
        (candidate) =>
          candidate.includes(normalizedTarget) ||
          normalizedTarget.includes(candidate)
      );
    }) ?? null;

  if (containsMatch) {
    return containsMatch;
  }

  return findBestFeatureByCandidateStrings(
    features,
    (feature) => getNormalizedFeatureFieldValues(feature, fieldNames),
    targetName
  );
}

export function getPreferredDistrictReferenceTokens(feature: Graphic): string[] {
  const name2 = normalizeMatchValue(
    getAttributeStringCaseInsensitive(feature, ["name_2"])
  );

  const varnameTokens = splitPipeAliasTokens(
    getAttributeStringCaseInsensitive(feature, ["varname_2"])
  );

  const merged = [...varnameTokens, name2].filter(Boolean);

  return Array.from(new Set(merged));
}

export async function searchDistrictFeatureByNameOrVarname(
  layer: FeatureLayer,
  targetName: string
): Promise<Graphic | null> {
  const features = await queryAllFeatures(layer);
  const normalizedTarget = normalizeMatchValue(targetName);

  const directNameMatch =
    features.find((feature) => {
      const candidate = normalizeMatchValue(
        getAttributeStringCaseInsensitive(feature, ["name_2"])
      );

      return candidate === normalizedTarget;
    }) ?? null;

  if (directNameMatch) {
    return directNameMatch;
  }

  const aliasMatch =
    features.find((feature) => {
      const tokens = getPreferredDistrictReferenceTokens(feature);
      return tokens.includes(normalizedTarget);
    }) ?? null;

  if (aliasMatch) {
    return aliasMatch;
  }

  const containsMatch =
    features.find((feature) => {
      const tokens = getPreferredDistrictReferenceTokens(feature);
      return tokens.some(
        (token) =>
          token.includes(normalizedTarget) ||
          normalizedTarget.includes(token)
      );
    }) ?? null;

  if (containsMatch) {
    return containsMatch;
  }

  return findBestFeatureByCandidateStrings(
    features,
    (feature) => getPreferredDistrictReferenceTokens(feature),
    targetName
  );
}

export function getFeatureDisplayLabel(feature: Graphic): string {
  const preferredFields = [
    "port_name",
    "PORT_NAME",
    "Port_Name",
    "name",
    "Name",
    "title",
    "Title",
    "airport_name",
    "AIRPORT_NAME",
    "river_name",
    "RIVER_NAME",
    "bridge_name",
    "BRIDGE_NAME",
    "location",
    "Location",
    "place_name",
    "PLACE_NAME",
    "name_en",
    "NAME_EN",
    "name_3",
    "NAME_3",
    "name_2",
    "NAME_2",
    "name_1",
    "NAME_1",
  ];

  for (const fieldName of preferredFields) {
    const value = getAttributeValueCaseInsensitive(feature, [fieldName]);

    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value).trim();
    }
  }

  const attributes = feature.attributes ?? {};
  const firstUsableEntry = Object.entries(attributes).find(([, value]) => {
    return value !== null && value !== undefined && String(value).trim();
  });

  if (firstUsableEntry) {
    return String(firstUsableEntry[1]).trim();
  }

  return "Unnamed feature";
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

function isFeatureLayer(layer: Layer | null | undefined): layer is FeatureLayer {
  return !!layer && layer.type === "feature";
}

export function getFeatureLayerById(
  map: Map,
  layerId: string
): FeatureLayer | null {
  const topLevelMatch = map.layers.find((item) => item.id === layerId);
  if (topLevelMatch instanceof FeatureLayer) {
    return topLevelMatch;
  }

  const allLayers = map.allLayers?.toArray?.() ?? [];
  const deepMatch = allLayers.find((item) => item.id === layerId);

  return deepMatch instanceof FeatureLayer ? deepMatch : null;
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

export function ensureLayerVisible(layer: FeatureLayer): void {
  if (!layer.visible) {
    layer.visible = true;
  }
}

export function setAdministrativeLayerVisibility(
  map: Map,
  activeLayerId: "division" | "district" | "upazila"
): void {
  const adminLayerIds: Array<"division" | "district" | "upazila"> = [
    "division",
    "district",
    "upazila",
  ];

  for (const layerId of adminLayerIds) {
    const layer = getFeatureLayerById(map, layerId);

    if (!layer || !isFeatureLayer(layer)) {
      continue;
    }

    layer.visible = layerId === activeLayerId;
  }
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

    const feature = await searchFeatureByFields(
      layer,
      ["name_1", "division", "division_name", "name", "name_en"],
      areaName
    );

    return feature ? { feature, layer } : null;
  }

  if (areaType === "district") {
    const layer = getDistrictLayer(map);

    if (!layer) {
      return null;
    }

    const feature =
      (await searchDistrictFeatureByNameOrVarname(layer, areaName)) ??
      (await searchFeatureByFields(
        layer,
        [
          "name_2",
          "district",
          "district_name",
          "name",
          "name_en",
          "adm2_en",
          "adm2_name",
        ],
        areaName
      ));

    return feature ? { feature, layer } : null;
  }

  const layer = getUpazilaLayer(map);

  if (!layer) {
    return null;
  }

  const feature = await searchFeatureByFields(
    layer,
    [
      "name_3",
      "upazila_name",
      "upazila",
      "name",
      "name_en",
      "adm3_en",
      "adm3_name",
      "thana",
    ],
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