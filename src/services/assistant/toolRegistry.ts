import type {
  AssistantExecutionContext,
  AssistantToolArgs,
  AssistantToolName,
  AssistantToolResult,
} from "./toolTypes";

import { compareRegionsTool } from "./tools/compareRegionsTool";
import { findNearestFeatureTool } from "./tools/findNearestFeatureTool";
import { getWeatherContextTool } from "./tools/getWeatherContextTool";
import { highlightFeatureTool } from "./tools/highlightFeatureTool";
import { openAttributeTableTool } from "./tools/openAttributeTableTool";
import { queryAdministrativeLayerTool } from "./tools/queryAdministrativeLayerTool";
import { rankAdministrativeRegionsTool } from "./tools/rankAdministrativeRegionsTool";
import { resetMapTool } from "./tools/resetMapTool";
import { setLayerVisibilityTool } from "./tools/setLayerVisibilityTool";
import { summarizeVisibleMapTool } from "./tools/summarizeVisibleMapTool";
import { zoomToBangladeshTool } from "./tools/zoomToBangladeshTool";
import { zoomToFeatureTool } from "./tools/zoomToFeatureTool";

export type AssistantToolHandler = (
  args: AssistantToolArgs,
  context: AssistantExecutionContext,
  previousResults: AssistantToolResult[]
) => Promise<Omit<AssistantToolResult, "tool" | "success">>;

export const toolRegistry: Record<AssistantToolName, AssistantToolHandler> = {
  queryAdministrativeLayer: queryAdministrativeLayerTool,
  openAttributeTable: openAttributeTableTool,
  zoomToFeature: zoomToFeatureTool,
  highlightFeature: highlightFeatureTool,
  findNearestFeature: findNearestFeatureTool,
  compareRegions: compareRegionsTool,
  summarizeVisibleMap: summarizeVisibleMapTool,
  getWeatherContext: getWeatherContextTool,
  rankAdministrativeRegions: rankAdministrativeRegionsTool,
  setLayerVisibility: setLayerVisibilityTool,
  resetMap: resetMapTool,
  zoomToBangladesh: zoomToBangladeshTool,
};