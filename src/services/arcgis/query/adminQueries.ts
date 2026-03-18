import {
  buildDistrictResponse,
  buildDivisionResponse,
  buildUpazilaResponse,
} from "./responseBuilders";
import { closePopupIfNeeded, zoomHighlightAndOpen } from "./popupActions";
import {
  extractGenericAdministrativeName,
  getGenericSearchPriority,
} from "./textUtils";
import {
  getDistrictLayer,
  getDivisionLayer,
  getUpazilaLayer,
  searchFeatureByField,
  searchFeatureByFields,
} from "./featureSearch";

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Map from "@arcgis/core/Map";
import type MapView from "@arcgis/core/views/MapView";
import type { QueryResult } from "./types";
import { clearActiveHighlight } from "../highlightActions";
import { setExclusiveVisibleLayers } from "../visibilityActions";

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
          await zoomHighlightAndOpen(
            map,
            view,
            divisionMatch,
            "division",
            divisionLayer
          );

          return {
            ok: true,
            message: buildDivisionResponse(divisionMatch, prompt),
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
          await zoomHighlightAndOpen(
            map,
            view,
            districtMatch,
            "district",
            districtLayer
          );

          return {
            ok: true,
            message: buildDistrictResponse(districtMatch, prompt),
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
          await zoomHighlightAndOpen(
            map,
            view,
            upazilaMatch,
            "upazila",
            upazilaLayer
          );

          return {
            ok: true,
            message: buildUpazilaResponse(upazilaMatch, prompt),
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