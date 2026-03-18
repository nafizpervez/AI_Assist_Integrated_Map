import {
  getUpazilaLayer,
  searchFeatureByFields,
} from "./featureSearch";

import type Map from "@arcgis/core/Map";
import type MapView from "@arcgis/core/views/MapView";
import type { QueryResult } from "./types";
import { buildUpazilaResponse } from "./responseBuilders";
import { clearActiveHighlight } from "../highlightActions";
import { extractUpazilaName } from "./textUtils";
import { zoomHighlightAndOpen } from "./popupActions";

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

    await zoomHighlightAndOpen(
      map,
      view,
      matchedFeature,
      "upazila",
      upazilaLayer
    );

    return {
      ok: true,
      message: buildUpazilaResponse(matchedFeature, prompt),
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