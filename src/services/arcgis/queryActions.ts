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

  if (normalized.startsWith("population ")) {
    return normalizeText(normalized.slice("population ".length));
  }

  if (normalized.startsWith("show me ")) {
    return normalizeText(normalized.slice("show me ".length));
  }

  if (normalized.startsWith("show ")) {
    return normalizeText(normalized.slice("show ".length));
  }

  if (normalized.startsWith("district ")) {
    return normalizeText(normalized.slice("district ".length));
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

function getDistrictPopupLocation(feature: Graphic) {
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
    `District search completed successfully.`,
    ``,
    `District: ${districtName}`,
    `Total Population: ${totalPopulation}`,
    `Male Population: ${malePopulation}`,
    `Female Population: ${femalePopulation}`,
  ].join("\n");
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

  const districtLayer = map.layers.find((layer) => layer.id === "district");

  if (!districtLayer || !(districtLayer instanceof FeatureLayer)) {
    return {
      ok: false,
      message: 'The "District with population" layer was not found.',
      matchedLayer: "District with population",
    };
  }

  try {
    districtLayer.visible = true;
    await districtLayer.load();

    const query = districtLayer.createQuery();
    query.where = "1=1";
    query.outFields = ["*"];
    query.returnGeometry = true;

    const featureSet = await districtLayer.queryFeatures(query);

    const matchedFeature =
      featureSet.features.find((feature) => {
        const rawValue = feature.attributes?.name_2;
        const candidate = normalizeText(String(rawValue ?? ""));
        return candidate === districtName;
      }) ?? null;

    if (!matchedFeature) {
      return {
        ok: false,
        message: `No district matched "${districtName}".`,
        matchedLayer: "District with population",
      };
    }

    const targetGeometry = matchedFeature.geometry;

    if (!targetGeometry) {
      return {
        ok: false,
        message: `The district "${districtName}" was found, but its geometry is missing.`,
        matchedLayer: "District with population",
      };
    }

    if ("extent" in targetGeometry && targetGeometry.extent) {
      await view.goTo(targetGeometry.extent.expand(1.5));
    } else {
      await view.goTo(targetGeometry);
    }

    await highlightGraphic(view, matchedFeature);

    if (view.popup) {
      const popupLocation = getDistrictPopupLocation(matchedFeature);

      view.popup.open({
        features: [matchedFeature],
        location: popupLocation ?? undefined,
      });
    }

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