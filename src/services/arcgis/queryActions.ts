import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";

import {
  clearActiveHighlight,
  highlightGraphic,
} from "./highlightActions";

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView";
import type Graphic from "@arcgis/core/Graphic";
import type Map from "@arcgis/core/Map";
import type MapView from "@arcgis/core/views/MapView";
import { setExclusiveVisibleLayers } from "./visibilityActions";

interface QueryResult {
  ok: boolean;
  message: string;
  matchedLayer?: string | null;
}

type AdminLevel = "division" | "district" | "upazila";

type GraphicWithSourceLayer = Graphic & {
  sourceLayer?: unknown;
};

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function extractDistrictName(prompt: string): string {
  const normalized = normalizeText(prompt);

  if (normalized.startsWith("what is the population of district ")) {
    return normalizeText(
      normalized.slice("what is the population of district ".length)
    );
  }

  if (normalized.startsWith("population district ")) {
    return normalizeText(normalized.slice("population district ".length));
  }

  if (normalized.startsWith("people live in district ")) {
    return normalizeText(normalized.slice("people live in district ".length));
  }

  if (normalized.startsWith("show me district ")) {
    return normalizeText(normalized.slice("show me district ".length));
  }

  if (normalized.startsWith("district ")) {
    return normalizeText(normalized.slice("district ".length));
  }

  return normalized;
}

function extractDivisionName(prompt: string): string {
  const normalized = normalizeText(prompt);

  if (normalized.startsWith("what is the population of division ")) {
    return normalizeText(
      normalized.slice("what is the population of division ".length)
    );
  }

  if (normalized.startsWith("population division ")) {
    return normalizeText(normalized.slice("population division ".length));
  }

  if (normalized.startsWith("people live in division ")) {
    return normalizeText(normalized.slice("people live in division ".length));
  }

  if (normalized.startsWith("show me division ")) {
    return normalizeText(normalized.slice("show me division ".length));
  }

  if (normalized.startsWith("division ")) {
    return normalizeText(normalized.slice("division ".length));
  }

  return normalized;
}

function extractUpazilaName(prompt: string): string {
  const normalized = normalizeText(prompt);

  if (normalized.startsWith("where is upazila ")) {
    return normalizeText(normalized.slice("where is upazila ".length));
  }

  if (normalized.startsWith("upazila ")) {
    return normalizeText(normalized.slice("upazila ".length));
  }

  if (normalized.startsWith("where is ")) {
    return normalizeText(normalized.slice("where is ".length));
  }

  if (normalized.startsWith("where ")) {
    return normalizeText(normalized.slice("where ".length));
  }

  return normalized;
}

function extractGenericAdministrativeName(prompt: string): string {
  const normalized = normalizeText(prompt);

  if (normalized.startsWith("what is the population of ")) {
    return normalizeText(
      normalized.slice("what is the population of ".length)
    );
  }

  if (normalized.startsWith("population ")) {
    return normalizeText(normalized.slice("population ".length));
  }

  if (normalized.startsWith("people live in ")) {
    return normalizeText(normalized.slice("people live in ".length));
  }

  if (normalized.startsWith("where is ")) {
    return normalizeText(normalized.slice("where is ".length));
  }

  if (normalized.startsWith("where ")) {
    return normalizeText(normalized.slice("where ".length));
  }

  if (normalized.startsWith("show me ")) {
    return normalizeText(normalized.slice("show me ".length));
  }

  if (normalized.startsWith("show ")) {
    return normalizeText(normalized.slice("show ".length));
  }

  return normalized;
}

function getGenericSearchPriority(prompt: string): AdminLevel[] {
  const normalized = normalizeText(prompt);

  if (
    normalized.startsWith("what is the population of ") ||
    normalized.startsWith("population ") ||
    normalized.startsWith("people live in ")
  ) {
    return ["district", "division", "upazila"];
  }

  if (normalized.startsWith("where is ") || normalized.startsWith("where ")) {
    return ["upazila", "district", "division"];
  }

  return ["division", "district", "upazila"];
}

function formatPopulation(value: unknown): string {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-US").format(numericValue);
}

function getPopupLocation(feature: Graphic) {
  const geometry = feature.geometry;

  if (!geometry) {
    return null;
  }

  if ("extent" in geometry && geometry.extent) {
    return geometry.extent.center;
  }

  if ("centroid" in geometry && geometry.centroid) {
    return geometry.centroid;
  }

  return null;
}

function attachFeatureContext(
  feature: Graphic,
  layer: FeatureLayer
): GraphicWithSourceLayer {
  const enrichedFeature = feature as GraphicWithSourceLayer;

  enrichedFeature.sourceLayer = layer;
  enrichedFeature.popupTemplate = layer.popupTemplate ?? feature.popupTemplate;

  return enrichedFeature;
}

function getObjectIdFieldName(layer: FeatureLayer): string | null {
  if (layer.objectIdField) {
    return layer.objectIdField;
  }

  const oidField = layer.fields?.find((field) => field.type === "oid");
  return oidField?.name ?? null;
}

function getFeatureObjectId(
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

async function waitForLayerViewReady(
  view: MapView,
  layer: FeatureLayer
): Promise<FeatureLayerView> {
  const layerView = (await view.whenLayerView(layer)) as FeatureLayerView;

  await reactiveUtils.whenOnce(() => !view.updating);
  await reactiveUtils.whenOnce(() => !layerView.updating);

  return layerView;
}

async function nextTick(): Promise<void> {
  await new Promise<void>((resolve) => {
    window.setTimeout(() => resolve(), 0);
  });
}

async function getPopupFeatureFromLayer(
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

async function closePopupIfNeeded(view: MapView): Promise<void> {
  if (!view.popup) {
    return;
  }

  if (view.popup.visible) {
    view.popup.close();
    await nextTick();
  }
}

async function openPopupForFeature(
  view: MapView,
  feature: Graphic
): Promise<void> {
  if (!view.popup) {
    return;
  }

  const popupLocation = getPopupLocation(feature) ?? undefined;

  view.popupEnabled = true;

  await closePopupIfNeeded(view);

  try {
    await view.openPopup({
      features: [feature],
      location: popupLocation,
    });

    await nextTick();
  } catch (error) {
    console.warn("view.openPopup(features) failed, falling back:", error);

    view.popup.open({
      features: [feature],
      location: popupLocation,
    });

    await nextTick();
  }

  if (!view.popup.visible && popupLocation) {
    try {
      await view.openPopup({
        location: popupLocation,
        fetchFeatures: true,
      });

      await nextTick();
    } catch (error) {
      console.warn("view.openPopup(fetchFeatures) failed:", error);
    }
  }

  if (!view.popup.visible) {
    view.popup.open({
      features: [feature],
      location: popupLocation,
    });
  }
}

function buildDistrictResponse(feature: Graphic): string {
  const districtName = String(feature.attributes?.name_2 ?? "Unknown District");
  const totalPopulation = formatPopulation(feature.attributes?.t_tl);
  const malePopulation = formatPopulation(feature.attributes?.m_tl);
  const femalePopulation = formatPopulation(feature.attributes?.f_tl);

  return [
    "District search completed successfully.",
    "",
    `District: ${districtName}`,
    `Total Population: ${totalPopulation}`,
    `Male Population: ${malePopulation}`,
    `Female Population: ${femalePopulation}`,
  ].join("\n");
}

function buildDivisionResponse(feature: Graphic): string {
  const divisionName = String(feature.attributes?.name_1 ?? "Unknown Division");
  const totalPopulation = formatPopulation(feature.attributes?.f2011_total);
  const urbanPopulation = formatPopulation(feature.attributes?.f2011_urban);
  const ruralPopulation = formatPopulation(feature.attributes?.f2011_rural);

  return [
    "Division search completed successfully.",
    "",
    `Division: ${divisionName}`,
    `Total Population: ${totalPopulation}`,
    `Urban Population: ${urbanPopulation}`,
    `Rural Population: ${ruralPopulation}`,
  ].join("\n");
}

function buildUpazilaResponse(feature: Graphic): string {
  const upazilaName = String(
    feature.attributes?.name_3 ??
      feature.attributes?.upazila ??
      feature.attributes?.upazila_name ??
      "Unknown Upazila"
  );

  return [
    "Upazila search completed successfully.",
    "",
    `Upazila: ${upazilaName}`,
    "Status: Boundary located and map updated",
  ].join("\n");
}

async function zoomHighlightAndOpen(
  map: Map,
  view: MapView,
  feature: Graphic,
  targetLayerId: string,
  targetLayer: FeatureLayer
): Promise<void> {
  const targetGeometry = feature.geometry;

  if (!targetGeometry) {
    return;
  }

  setExclusiveVisibleLayers(map, ["bd-boundary", targetLayerId]);
  targetLayer.visible = true;
  targetLayer.popupEnabled = true;

  await view.when();
  await targetLayer.load();

  const layerView = await waitForLayerViewReady(view, targetLayer);

  await closePopupIfNeeded(view);
  clearActiveHighlight();

  if ("extent" in targetGeometry && targetGeometry.extent) {
    await view.goTo(targetGeometry.extent.expand(1.5));
  } else {
    await view.goTo(targetGeometry);
  }

  await reactiveUtils.whenOnce(() => !view.updating);
  await reactiveUtils.whenOnce(() => !layerView.updating);
  await nextTick();

  const popupFeature = await getPopupFeatureFromLayer(targetLayer, feature, view);

  await highlightGraphic(view, popupFeature, targetLayer);
  await nextTick();
  await openPopupForFeature(view, popupFeature);
}

async function searchFeatureByField(
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

async function searchFeatureByFields(
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

function getDistrictLayer(map: Map): FeatureLayer | null {
  const layer = map.layers.find((item) => item.id === "district");
  return layer instanceof FeatureLayer ? layer : null;
}

function getDivisionLayer(map: Map): FeatureLayer | null {
  const layer = map.layers.find((item) => item.id === "division");
  return layer instanceof FeatureLayer ? layer : null;
}

function getUpazilaLayer(map: Map): FeatureLayer | null {
  const layer = map.layers.find((item) => item.id === "upazila");
  return layer instanceof FeatureLayer ? layer : null;
}

export async function zoomToBangladesh(
  map: Map | null,
  view: MapView | null
): Promise<QueryResult> {
  if (!map || !view) {
    return {
      ok: false,
      message: "Map is not ready yet.",
      matchedLayer: null,
    };
  }

  const boundaryLayer = map.layers.find((layer) => layer.id === "bd-boundary");

  if (!boundaryLayer || !(boundaryLayer instanceof FeatureLayer)) {
    return {
      ok: false,
      message: "Bangladesh Boundary layer was not found.",
      matchedLayer: null,
    };
  }

  try {
    setExclusiveVisibleLayers(map, ["bd-boundary"]);
    await boundaryLayer.load();

    const result = await boundaryLayer.queryExtent({
      where: "1=1",
    });

    if (!result.extent) {
      return {
        ok: false,
        message: "Could not find the Bangladesh extent.",
        matchedLayer: "Bangladesh Boundary",
      };
    }

    await closePopupIfNeeded(view);
    clearActiveHighlight();

    await view.goTo(result.extent.expand(1.1));

    return {
      ok: true,
      message: "Zoomed to Bangladesh.",
      matchedLayer: "Bangladesh Boundary",
    };
  } catch (error) {
    console.error("zoomToBangladesh failed:", error);

    return {
      ok: false,
      message: "Failed to zoom to Bangladesh.",
      matchedLayer: "Bangladesh Boundary",
    };
  }
}

export async function findDistrictAndZoom(
  map: Map | null,
  view: MapView | null,
  prompt: string
): Promise<QueryResult> {
  if (!map || !view) {
    return {
      ok: false,
      message: "Map is not ready yet.",
      matchedLayer: "District with population",
    };
  }

  const districtName = extractDistrictName(prompt);

  if (!districtName) {
    return {
      ok: false,
      message: "Please provide a district name.",
      matchedLayer: "District with population",
    };
  }

  const districtLayer = getDistrictLayer(map);

  if (!districtLayer) {
    return {
      ok: false,
      message: 'The "District with population" layer was not found.',
      matchedLayer: "District with population",
    };
  }

  try {
    const matchedFeature = await searchFeatureByField(
      districtLayer,
      "name_2",
      districtName
    );

    if (!matchedFeature) {
      return {
        ok: false,
        message: `No district matched "${districtName}".`,
        matchedLayer: "District with population",
      };
    }

    if (!matchedFeature.geometry) {
      return {
        ok: false,
        message: `The district "${districtName}" was found, but its geometry is missing.`,
        matchedLayer: "District with population",
      };
    }

    await zoomHighlightAndOpen(map, view, matchedFeature, "district", districtLayer);

    return {
      ok: true,
      message: buildDistrictResponse(matchedFeature),
      matchedLayer: "District with population",
    };
  } catch (error) {
    console.error("findDistrictAndZoom failed:", error);
    clearActiveHighlight();

    if (view.popup) {
      view.popup.close();
    }

    return {
      ok: false,
      message: "Failed to search for the district.",
      matchedLayer: "District with population",
    };
  }
}

export async function findDivisionAndZoom(
  map: Map | null,
  view: MapView | null,
  prompt: string
): Promise<QueryResult> {
  if (!map || !view) {
    return {
      ok: false,
      message: "Map is not ready yet.",
      matchedLayer: "Division with population",
    };
  }

  const divisionName = extractDivisionName(prompt);

  if (!divisionName) {
    return {
      ok: false,
      message: "Please provide a division name.",
      matchedLayer: "Division with population",
    };
  }

  const divisionLayer = getDivisionLayer(map);

  if (!divisionLayer) {
    return {
      ok: false,
      message: 'The "Division with population" layer was not found.',
      matchedLayer: "Division with population",
    };
  }

  try {
    const matchedFeature = await searchFeatureByField(
      divisionLayer,
      "name_1",
      divisionName
    );

    if (!matchedFeature) {
      return {
        ok: false,
        message: `No division matched "${divisionName}".`,
        matchedLayer: "Division with population",
      };
    }

    if (!matchedFeature.geometry) {
      return {
        ok: false,
        message: `The division "${divisionName}" was found, but its geometry is missing.`,
        matchedLayer: "Division with population",
      };
    }

    await zoomHighlightAndOpen(map, view, matchedFeature, "division", divisionLayer);

    return {
      ok: true,
      message: buildDivisionResponse(matchedFeature),
      matchedLayer: "Division with population",
    };
  } catch (error) {
    console.error("findDivisionAndZoom failed:", error);
    clearActiveHighlight();

    if (view.popup) {
      view.popup.close();
    }

    return {
      ok: false,
      message: "Failed to search for the division.",
      matchedLayer: "Division with population",
    };
  }
}

export async function findUpazilaAndZoom(
  map: Map | null,
  view: MapView | null,
  prompt: string
): Promise<QueryResult> {
  if (!map || !view) {
    return {
      ok: false,
      message: "Map is not ready yet.",
      matchedLayer: "Upazila with population",
    };
  }

  const upazilaName = extractUpazilaName(prompt);

  if (!upazilaName) {
    return {
      ok: false,
      message: "Please provide an upazila name.",
      matchedLayer: "Upazila with population",
    };
  }

  const upazilaLayer = getUpazilaLayer(map);

  if (!upazilaLayer) {
    return {
      ok: false,
      message: 'The "Upazila with population" layer was not found.',
      matchedLayer: "Upazila with population",
    };
  }

  try {
    const matchedFeature = await searchFeatureByFields(
      upazilaLayer,
      ["name_3", "upazila_name", "upazila", "name", "name_en"],
      upazilaName
    );

    if (!matchedFeature) {
      return {
        ok: false,
        message: `No upazila matched "${upazilaName}".`,
        matchedLayer: "Upazila with population",
      };
    }

    if (!matchedFeature.geometry) {
      return {
        ok: false,
        message: `The upazila "${upazilaName}" was found, but its geometry is missing.`,
        matchedLayer: "Upazila with population",
      };
    }

    await zoomHighlightAndOpen(map, view, matchedFeature, "upazila", upazilaLayer);

    return {
      ok: true,
      message: buildUpazilaResponse(matchedFeature),
      matchedLayer: "Upazila with population",
    };
  } catch (error) {
    console.error("findUpazilaAndZoom failed:", error);
    clearActiveHighlight();

    if (view.popup) {
      view.popup.close();
    }

    return {
      ok: false,
      message: "Failed to search for the upazila.",
      matchedLayer: "Upazila with population",
    };
  }
}

export async function findAdministrativeAreaAndZoom(
  map: Map | null,
  view: MapView | null,
  prompt: string
): Promise<QueryResult> {
  if (!map || !view) {
    return {
      ok: false,
      message: "Map is not ready yet.",
      matchedLayer: null,
    };
  }

  const placeName = extractGenericAdministrativeName(prompt);

  if (!placeName) {
    return {
      ok: false,
      message: "Please provide an administrative area name.",
      matchedLayer: null,
    };
  }

  const districtLayer = getDistrictLayer(map);
  const divisionLayer = getDivisionLayer(map);
  const upazilaLayer = getUpazilaLayer(map);

  if (!districtLayer && !divisionLayer && !upazilaLayer) {
    return {
      ok: false,
      message:
        'District, Division, and Upazila layers were not found in the current map.',
      matchedLayer: null,
    };
  }

  try {
    const searchPriority = getGenericSearchPriority(prompt);

    for (const level of searchPriority) {
      if (level === "division" && divisionLayer) {
        const divisionMatch = await searchFeatureByField(
          divisionLayer,
          "name_1",
          placeName
        );

        if (divisionMatch?.geometry) {
          await zoomHighlightAndOpen(map, view, divisionMatch, "division", divisionLayer);

          return {
            ok: true,
            message: buildDivisionResponse(divisionMatch),
            matchedLayer: "Division with population",
          };
        }
      }

      if (level === "district" && districtLayer) {
        const districtMatch = await searchFeatureByField(
          districtLayer,
          "name_2",
          placeName
        );

        if (districtMatch?.geometry) {
          await zoomHighlightAndOpen(map, view, districtMatch, "district", districtLayer);

          return {
            ok: true,
            message: buildDistrictResponse(districtMatch),
            matchedLayer: "District with population",
          };
        }
      }

      if (level === "upazila" && upazilaLayer) {
        const upazilaMatch = await searchFeatureByFields(
          upazilaLayer,
          ["name_3", "upazila_name", "upazila", "name", "name_en"],
          placeName
        );

        if (upazilaMatch?.geometry) {
          await zoomHighlightAndOpen(map, view, upazilaMatch, "upazila", upazilaLayer);

          return {
            ok: true,
            message: buildUpazilaResponse(upazilaMatch),
            matchedLayer: "Upazila with population",
          };
        }
      }
    }

    return {
      ok: false,
      message: `No division, district, or upazila matched "${placeName}".`,
      matchedLayer: null,
    };
  } catch (error) {
    console.error("findAdministrativeAreaAndZoom failed:", error);
    clearActiveHighlight();

    if (view.popup) {
      view.popup.close();
    }

    return {
      ok: false,
      message: "Failed to search for the administrative area.",
      matchedLayer: null,
    };
  }
}