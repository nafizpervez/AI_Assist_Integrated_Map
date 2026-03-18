import type { AssistantResponse } from "../../../types/assistant";
import type Map from "@arcgis/core/Map";
import type MapView from "@arcgis/core/views/MapView";
import { executeMapAction } from "../../arcgis/mapActions";
import { formatAssistantResponse } from "../responseFormatter";

interface Params {
  prompt: string;
  intent:
    | "zoomToBangladesh"
    | "zoomToDistrict"
    | "zoomToDivision"
    | "zoomToAdministrativeArea";
  map: Map | null;
  view: MapView | null;
}

export async function runBangladeshAdminAgent({
  prompt,
  intent,
  map,
  view,
}: Params): Promise<AssistantResponse> {
  const result = await executeMapAction({
    action: intent,
    prompt,
    map,
    view,
  });

  return formatAssistantResponse({
    prompt,
    answer: result.message,
    agent: "bangladeshAdminAgent",
    intent,
    success: result.ok,
    matchedLayer: result.matchedLayer ?? null,
  });
}