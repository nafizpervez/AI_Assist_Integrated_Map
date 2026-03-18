import {
  buildDivisionExtremeResponse,
  buildDivisionResponse,
} from "./responseBuilders";
import {
  extractDivisionName,
  getPopulationExtreme,
  isDivisionPopulationExtremePrompt,
} from "./textUtils";
import {
  getDivisionLayer,
  searchExtremeFeatureByNumericField,
  searchFeatureByField,
} from "./featureSearch";

import type Map from "@arcgis/core/Map";
import type MapView from "@arcgis/core/views/MapView";
import type { QueryResult } from "./types";
import { clearActiveHighlight } from "../highlightActions";
import { resetLayerFilters } from "../visibilityActions";
import { zoomHighlightAndOpen } from "./popupActions";

async function findDivisionByPopulationExtremeAndZoom(
  map: Map,
  view: MapView,
  prompt: string
): Promise<QueryResult> {
  const divisionLayer = getDivisionLayer(map);

  if (!divisionLayer) {
    return {
      ok: false,
      message: 'The "Division with population" layer was not found.',
      matchedLayer: "Division with population",
    };
  }

  const extreme = getPopulationExtreme(prompt);

  if (!extreme) {
    return {
      ok: false,
      message:
        "Could not determine whether to search for highest or lowest division population.",
      matchedLayer: "Division with population",
    };
  }

  try {
    const matchedFeature = await searchExtremeFeatureByNumericField(
      divisionLayer,
      "f2011_total",
      extreme
    );

    if (!matchedFeature) {
      return {
        ok: false,
        message: `Could not determine the division with ${extreme} population.`,
        matchedLayer: "Division with population",
      };
    }

    await zoomHighlightAndOpen(
      map,
      view,
      matchedFeature,
      "division",
      divisionLayer
    );

    return {
      ok: true,
      message: buildDivisionExtremeResponse(matchedFeature, extreme),
      matchedLayer: "Division with population",
    };
  } catch (error) {
    console.error("findDivisionByPopulationExtremeAndZoom failed:", error);
    clearActiveHighlight();

    if (view.popup) {
      view.popup.close();
    }

    return {
      ok: false,
      message: `Failed to search for the division with ${extreme} population.`,
      matchedLayer: "Division with population",
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

  resetLayerFilters(map);

  if (isDivisionPopulationExtremePrompt(prompt)) {
    return findDivisionByPopulationExtremeAndZoom(map, view, prompt);
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

    await zoomHighlightAndOpen(
      map,
      view,
      matchedFeature,
      "division",
      divisionLayer
    );

    return {
      ok: true,
      message: buildDivisionResponse(matchedFeature, prompt),
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