import type { RoutedPrompt } from "../../types/assistant";

export function routePrompt(prompt: string): RoutedPrompt {
  const normalized = prompt.trim().toLowerCase();

  if (!normalized) {
    return {
      prompt,
      normalized,
      agent: "system",
      intent: "unknown",
    };
  }

  if (
    normalized.includes("what layers are visible") ||
    normalized.includes("which layers are visible") ||
    normalized.includes("visible layers")
  ) {
    return {
      prompt,
      normalized,
      agent: "summaryAgent",
      intent: "listVisibleLayers",
    };
  }

  if (normalized.includes("zoom") && normalized.includes("bangladesh")) {
    return {
      prompt,
      normalized,
      agent: "bangladeshAdminAgent",
      intent: "zoomToBangladesh",
    };
  }

  if (normalized.startsWith("show ")) {
    return {
      prompt,
      normalized,
      agent: "layerControlAgent",
      intent: "showLayer",
    };
  }

  if (normalized.startsWith("hide ")) {
    return {
      prompt,
      normalized,
      agent: "layerControlAgent",
      intent: "hideLayer",
    };
  }

  return {
    prompt,
    normalized,
    agent: "fallback",
    intent: "unknown",
  };
}