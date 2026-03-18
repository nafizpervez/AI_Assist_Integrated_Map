import type { AssistantResponse } from "../../../types/assistant";
import type Map from "@arcgis/core/Map";
import { executeMapAction } from "../../arcgis/mapActions";
import { formatAssistantResponse } from "../responseFormatter";

interface Params {
  prompt: string;
  map: Map | null;
}

export async function runSummaryAgent({
  prompt,
  map,
}: Params): Promise<AssistantResponse> {
  const result = await executeMapAction({
    action: "listVisibleLayers",
    prompt,
    map,
    view: null,
  });

  return formatAssistantResponse({
    prompt,
    answer: result.message,
    agent: "summaryAgent",
    intent: "listVisibleLayers",
    success: result.ok,
    matchedLayer: result.matchedLayer ?? null,
  });
}