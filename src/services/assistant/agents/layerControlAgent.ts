import type { AssistantResponse } from "../../../types/assistant";
import type Map from "@arcgis/core/Map";
import { executeMapAction } from "../../arcgis/mapActions";
import { formatAssistantResponse } from "../responseFormatter";

interface Params {
  prompt: string;
  intent: "showLayer" | "hideLayer";
  map: Map | null;
}

export async function runLayerControlAgent({
  prompt,
  intent,
  map,
}: Params): Promise<AssistantResponse> {
  const result = await executeMapAction({
    action: intent,
    prompt,
    map,
    view: null,
  });

  return formatAssistantResponse({
    prompt,
    answer: result.message,
    agent: "layerControlAgent",
    intent,
    success: result.ok,
    matchedLayer: result.matchedLayer ?? null,
  });
}