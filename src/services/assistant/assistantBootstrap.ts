import type { AssistantResponse } from "../../types/assistant";
import type Map from "@arcgis/core/Map";
import type MapView from "@arcgis/core/views/MapView";
import { formatAssistantResponse } from "./responseFormatter";
import { routePrompt } from "./intentRouter";
import { runBangladeshAdminAgent } from "./agents/bangladeshAdminAgent";
import { runLayerControlAgent } from "./agents/layerControlAgent";
import { runSummaryAgent } from "./agents/summaryAgent";

interface RunAssistantParams {
  prompt: string;
  map: Map | null;
  view: MapView | null;
}

export async function runAssistantPrompt({
  prompt,
  map,
  view,
}: RunAssistantParams): Promise<AssistantResponse> {
  const routed = routePrompt(prompt);

  if (!routed.normalized) {
    return formatAssistantResponse({
      prompt,
      answer: "Please enter a prompt.",
      agent: "system",
      intent: "unknown",
      success: false,
      matchedLayer: null,
    });
  }

  if (routed.agent === "layerControlAgent") {
    return runLayerControlAgent({
      prompt,
      intent: routed.intent as "showLayer" | "hideLayer",
      map,
    });
  }

  if (routed.agent === "summaryAgent") {
    return runSummaryAgent({
      prompt,
      map,
    });
  }

  if (routed.agent === "bangladeshAdminAgent") {
    return runBangladeshAdminAgent({
      prompt,
      map,
      view,
    });
  }

  return formatAssistantResponse({
    prompt,
    answer:
      "I understood the prompt, but I do not support that command yet. Try: show airports, hide district, show railways, what layers are visible, zoom to bangladesh.",
    agent: "fallback",
    intent: "unknown",
    success: false,
    matchedLayer: null,
  });
}