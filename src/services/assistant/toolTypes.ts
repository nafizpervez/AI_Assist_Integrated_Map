import type Map from "@arcgis/core/Map";
import type MapView from "@arcgis/core/views/MapView";

export type AssistantToolName =
  | "queryAdministrativeLayer"
  | "openAttributeTable"
  | "zoomToFeature"
  | "highlightFeature"
  | "findNearestFeature"
  | "compareRegions"
  | "summarizeVisibleMap"
  | "getWeatherContext"
  | "rankAdministrativeRegions"
  | "setLayerVisibility"
  | "resetMap"
  | "zoomToBangladesh";

export interface QueryAdministrativeLayerArgs {
  layerId: string;
  parentName?: string;
  targetName?: string;
  where?: string;
}

export interface OpenAttributeTableArgs {
  source?: "lastQueryResult";
  layerId?: string;
}

export interface ZoomToFeatureArgs {
  source?: "lastQueryResult" | "largestFromLastQueryResult";
  layerId?: string;
  objectId?: number;
}

export interface HighlightFeatureArgs {
  source?: "lastQueryResult" | "largestFromLastQueryResult";
  layerId?: string;
  objectId?: number;
}

export interface FindNearestFeatureArgs {
  layerId: string;
  useMapPoint?: boolean;
}

export interface CompareRegionsArgs {
  leftName: string;
  rightName: string;
  metric?: string;
}

export interface SummarizeVisibleMapArgs {
  includeCounts?: boolean;
}

export interface GetWeatherContextArgs {
  targetName?: string;
  useMapCenter?: boolean;
}

export type AdministrativeRankMetric =
  | "populationDensity"
  | "totalPopulation"
  | "femalePopulation"
  | "malePopulation"
  | "urbanPopulation"
  | "ruralPopulation";

export interface RankAdministrativeRegionsArgs {
  layerId: "district" | "division";
  metric: AdministrativeRankMetric;
  parentName?: string;
  rank?: "highest" | "lowest";
  zoomToResult?: boolean;
  highlightResult?: boolean;
  openPopup?: boolean;
}

export interface SetLayerVisibilityArgs {
  layerIds: string[];
  visible: boolean;
}

export interface ResetMapArgs {
  zoomToBangladesh?: boolean;
}

export interface ZoomToBangladeshArgs {
  includeBoundaryLayer?: boolean;
}

export type AssistantToolArgs =
  | QueryAdministrativeLayerArgs
  | OpenAttributeTableArgs
  | ZoomToFeatureArgs
  | HighlightFeatureArgs
  | FindNearestFeatureArgs
  | CompareRegionsArgs
  | SummarizeVisibleMapArgs
  | GetWeatherContextArgs
  | RankAdministrativeRegionsArgs
  | SetLayerVisibilityArgs
  | ResetMapArgs
  | ZoomToBangladeshArgs;

export interface AssistantToolCall {
  tool: AssistantToolName;
  args: AssistantToolArgs;
}

export interface AssistantToolResult {
  tool: AssistantToolName;
  success: boolean;
  message?: string;
  data?: unknown;
}

export interface AssistantQueryRow {
  [key: string]: string | number | boolean | null | undefined;
}

export interface AssistantQueryResultData {
  layerId: string;
  title: string;
  columns: string[];
  rows: AssistantQueryRow[];
  totalCount: number;
  objectIds: number[];
}

export interface AssistantHighlightHandle {
  remove: () => void;
}

export interface AssistantSessionState {
  lastQueryResult: AssistantQueryResultData | null;
  lastAttributeTable: unknown | null;
  lastSelectedFeature: {
    layerId: string;
    objectIds: number[];
  } | null;
  lastClickedPoint: { latitude: number; longitude: number } | null;
  activeHighlightHandle: AssistantHighlightHandle | null;
}

export interface AssistantExecutionContext {
  prompt: string;
  map: Map | null;
  view: MapView | null;
  session: AssistantSessionState;
}