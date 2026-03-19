export type AssistantAgent =
  | "system"
  | "layerControlAgent"
  | "summaryAgent"
  | "bangladeshAdminAgent"
  | "fallback"
  | "toolBasedAssistant";

export type AssistantIntent =
  | "showLayer"
  | "hideLayer"
  | "listVisibleLayers"
  | "zoomToBangladesh"
  | "zoomToDistrict"
  | "zoomToDivision"
  | "zoomToUpazila"
  | "zoomToAdministrativeArea"
  | "findLayerInArea"
  | "findLayerBySpatialRelation"
  | "showAttributeTable"
  | "toolExecution"
  | "unknown";

export type AssistantEntityType =
  | "division"
  | "district"
  | "upazila"
  | "country"
  | "layer"
  | "unknown";

export type AssistantMetric =
  | "population"
  | "urbanPopulation"
  | "ruralPopulation"
  | "visibleLayers"
  | "unknown";

export type AssistantRankDirection = "highest" | "lowest" | "none";

export interface AssistantResponseMeta {
  entityName?: string;
  entityType?: AssistantEntityType;
  metric?: AssistantMetric;
  metricValue?: string | number;
  rankDirection?: AssistantRankDirection;
  details?: Record<string, string | number>;
  toolResults?: unknown[];
}

export interface AssistantAttributeTable {
  title: string;
  layerId: string;
  columns: string[];
  rows: Record<string, unknown>[];
  totalCount: number;
  shownCount: number;
}

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
  meta?: AssistantResponseMeta | null;
  attributeTable?: AssistantAttributeTable | null;
}