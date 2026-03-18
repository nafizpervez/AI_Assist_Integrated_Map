import {
  clearActiveHighlight,
  highlightGraphic,
} from "./highlightActions";

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Graphic from "@arcgis/core/Graphic";
import type Map from "@arcgis/core/Map";
import type MapView from "@arcgis/core/views/MapView";

interface QueryResult {
  ok: boolean;
  message: string;
  matchedLayer?: string | null;
}


function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function extractDistrictName(prompt: string): string {
  const normalized = normalizeText(prompt);

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

function extractGenericAdministrativeName(prompt: string): string {
  const normalized = normalizeText(prompt);

  if (normalized.startsWith("population ")) {
    return normalizeText(normalized.slice("population ".length));
  }

  if (normalized.startsWith("people live in ")) {
    return normalizeText(normalized.slice("people live in ".length));
  }

  if (normalized.startsWith("show me ")) {
    return normalizeText(normalized.slice("show me ".length));
  }

  if (normalized.startsWith("show ")) {
    return normalizeText(normalized.slice("show ".length));
  }

  return normalized;
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

function buildAmbiguousAdministrativeResponse(placeName: string): string {
  return [
    "Administrative search needs clarification.",
    "",
    `Place Name: ${placeName}`,
    "Matched Levels: District, Division",
    'Action Required: Please specify "district <name>" or "division <name>"',
  ].join("\n");
}

async function zoomHighlightAndOpen(
  view: MapView,
  feature: Graphic
): Promise<void> {
  const targetGeometry = feature.geometry;

  if (!targetGeometry) {
    return;
  }

  if ("extent" in targetGeometry && targetGeometry.extent) {
    await view.goTo(targetGeometry.extent.expand(1.5));
  } else {
    await view.goTo(targetGeometry);
  }

  await highlightGraphic(view, feature);

  if (view.popup) {
    const popupLocation = getPopupLocation(feature);

    view.popup.open({
      features: [feature],
      location: popupLocation ?? undefined,
    });
  }
}

async function searchFeatureByField(
  layer: FeatureLayer,
  fieldName: string,
  targetName: string
): Promise<Graphic | null> {
  layer.visible = true;
  await layer.load();

  const query = layer.createQuery();
  query.where = "1=1";
  query.outFields = ["*"];
  query.returnGeometry = true;

  const featureSet = await layer.queryFeatures(query);

  return (
    featureSet.features.find((feature) => {
      const rawValue = feature.attributes?.[fieldName];
      const candidate = normalizeText(String(rawValue ?? ""));
      return candidate === targetName;
    }) ?? null
  );
}

function getDistrictLayer(map: Map): FeatureLayer | null {
  const layer = map.layers.find((item) => item.id === "district");
  return layer instanceof FeatureLayer ? layer : null;
}

function getDivisionLayer(map: Map): FeatureLayer | null {
  const layer = map.layers.find((item) => item.id === "division");
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

  const boundaryLayer = map.layers.find(
    (layer) => layer.id === "bd-boundary"
  );

  if (!boundaryLayer || !(boundaryLayer instanceof FeatureLayer)) {
    return {
      ok: false,
      message: "Bangladesh Boundary layer was not found.",
      matchedLayer: null,
    };
  }

  try {
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

    await zoomHighlightAndOpen(view, matchedFeature);

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

    await zoomHighlightAndOpen(view, matchedFeature);

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
      message: "Please provide a district or division name.",
      matchedLayer: null,
    };
  }

  const districtLayer = getDistrictLayer(map);
  const divisionLayer = getDivisionLayer(map);

  if (!districtLayer && !divisionLayer) {
    return {
      ok: false,
      message:
        'Neither "District with population" nor "Division with population" layer was found.',
      matchedLayer: null,
    };
  }

  try {
    let districtMatch: Graphic | null = null;
    let divisionMatch: Graphic | null = null;

    if (districtLayer) {
      districtMatch = await searchFeatureByField(
        districtLayer,
        "name_2",
        placeName
      );
    }

    if (divisionLayer) {
      divisionMatch = await searchFeatureByField(
        divisionLayer,
        "name_1",
        placeName
      );
    }

    if (districtMatch && divisionMatch) {
      clearActiveHighlight();

      if (view.popup) {
        view.popup.close();
      }

      return {
        ok: false,
        message: buildAmbiguousAdministrativeResponse(placeName),
        matchedLayer: "District with population / Division with population",
      };
    }

    if (districtMatch) {
      await zoomHighlightAndOpen(view, districtMatch);

      return {
        ok: true,
        message: buildDistrictResponse(districtMatch),
        matchedLayer: "District with population",
      };
    }

    if (divisionMatch) {
      await zoomHighlightAndOpen(view, divisionMatch);

      return {
        ok: true,
        message: buildDivisionResponse(divisionMatch),
        matchedLayer: "Division with population",
      };
    }

    return {
      ok: false,
      message: `No district or division matched "${placeName}".`,
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