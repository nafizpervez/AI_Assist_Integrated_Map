import { findDistrictAndZoom, zoomToBangladesh } from "./queryActions";
import { getVisibleLayersSummary, setLayerVisibility } from "./visibilityActions";

import type Map from "@arcgis/core/Map";
import type MapView from "@arcgis/core/views/MapView";

interface ExecuteMapActionParams {
  action:
    | "showLayer"
    | "hideLayer"
    | "listVisibleLayers"
    | "zoomToBangladesh"
    | "zoomToDistrict";
  prompt: string;
  map: Map | null;
  view: MapView | null;
}

interface ExecuteMapActionResult {
  ok: boolean;
  message: string;
  matchedLayer?: string | null;
}

export async function executeMapAction(
  params: ExecuteMapActionParams
): Promise<ExecuteMapActionResult> {
  switch (params.action) {
    case "showLayer":
      return setLayerVisibility(params.map, params.prompt, true);

    case "hideLayer":
      return setLayerVisibility(params.map, params.prompt, false);

    case "listVisibleLayers":
      return getVisibleLayersSummary(params.map);

    case "zoomToBangladesh": {
      const result = await zoomToBangladesh(params.map, params.view);
      return {
        ok: result.ok,
        message: result.message,
        matchedLayer: "Bangladesh Boundary",
      };
    }

    case "zoomToDistrict": {
      const result = await findDistrictAndZoom(params.map, params.view, params.prompt);
      return {
        ok: result.ok,
        message: result.message,
        matchedLayer: result.matchedLayer ?? "District with population",
      };
    }

    default:
      return {
        ok: false,
        message: "Unsupported action.",
        matchedLayer: null,
      };
  }
}