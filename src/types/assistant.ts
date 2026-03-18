export type AssistantAgent =
  | "system"
  | "layerControlAgent"
  | "summaryAgent"
  | "bangladeshAdminAgent"
  | "fallback";

export type AssistantIntent =
  | "showLayer"
  | "hideLayer"
  | "listVisibleLayers"
  | "zoomToBangladesh"
  | "zoomToDistrict"
  | "zoomToUpazila"
  | "unknown";

export interface RoutedPrompt {
  prompt: string;
  normalized: string;
  agent: AssistantAgent;
  intent: AssistantIntent;
}

export interface AssistantResponse {
  prompt: string;
  answer: string;
  agent: AssistantAgent;
  intent: AssistantIntent;
  success: boolean;
  matchedLayer?: string | null;
}