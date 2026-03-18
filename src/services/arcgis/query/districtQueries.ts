import {
  buildDistrictExtremeResponse,
  buildDistrictResponse,
} from "./responseBuilders";
import {
  extractDistrictName,
  getPopulationExtreme,
  isDistrictPopulationExtremePrompt,
} from "./textUtils";
import {
  getDistrictLayer,
  searchExtremeFeatureByNumericField,
  searchFeatureByField,
} from "./featureSearch";

import type Map from "@arcgis/core/Map";
import type MapView from "@arcgis/core/views/MapView";
import type { QueryResult } from "./types";
import { clearActiveHighlight } from "../highlightActions";
import { resetLayerFilters } from "../visibilityActions";
import { zoomHighlightAndOpen } from "./popupActions";

async function findDistrictByPopulationExtremeAndZoom(
  map: Map,
  view: MapView,
  prompt: string
): Promise<QueryResult> {
  const districtLayer = getDistrictLayer(map);

  if (!districtLayer) {
    return {
      ok: false,
      message: 'The "District with population" layer was not found.',
      matchedLayer: "District with population",
    };
  }

  const extreme = getPopulationExtreme(prompt);

  if (!extreme) {
    return {
      ok: false,
      message:
        "Could not determine whether to search for highest or lowest district population.",
      matchedLayer: "District with population",
    };
  }

  try {
    const matchedFeature = await searchExtremeFeatureByNumericField(
      districtLayer,
      "t_tl",
      extreme
    );

    if (!matchedFeature) {
      return {
        ok: false,
        message: `Could not determine the district with ${extreme} population.`,
        matchedLayer: "District with population",
      };
    }

    await zoomHighlightAndOpen(
      map,
      view,
      matchedFeature,
      "district",
      districtLayer
    );

    return {
      ok: true,
      message: buildDistrictExtremeResponse(matchedFeature, extreme),
      matchedLayer: "District with population",
    };
  } catch (error) {
    console.error("findDistrictByPopulationExtremeAndZoom failed:", error);
    clearActiveHighlight();

    if (view.popup) {
      view.popup.close();
    }

    return {
      ok: false,
      message: `Failed to search for the district with ${extreme} population.`,
      matchedLayer: "District with population",
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

  resetLayerFilters(map);

  if (isDistrictPopulationExtremePrompt(prompt)) {
    return findDistrictByPopulationExtremeAndZoom(map, view, prompt);
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

    await zoomHighlightAndOpen(
      map,
      view,
      matchedFeature,
      "district",
      districtLayer
    );

    return {
      ok: true,
      message: buildDistrictResponse(matchedFeature, prompt),
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