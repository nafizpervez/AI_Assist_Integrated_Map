import { getVisibleLayersSummary, setLayerVisibility } from "./visibilityActions";

import type Map from "@arcgis/core/Map";
import type MapView from "@arcgis/core/views/MapView";
import { zoomToBangladesh } from "./queryActions";

interface ExecuteMapActionParams {
  action: "showLayer" | "hideLayer" | "listVisibleLayers" | "zoomToBangladesh";
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

    default:
      return {
        ok: false,
        message: "Unsupported action.",
        matchedLayer: null,
      };
  }
}