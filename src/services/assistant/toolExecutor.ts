import type {
  AssistantExecutionContext,
  AssistantMultiLayerQueryResultData,
  AssistantQueryResultData,
  AssistantToolCall,
  AssistantToolResult,
  FindAdministrativeFeatureArgs,
  QueryAdministrativeLayerArgs,
} from "./toolTypes";

import { toolRegistry } from "./toolRegistry";

function isAssistantQueryResultData(value: unknown): value is AssistantQueryResultData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const data = value as Partial<AssistantQueryResultData>;

  return (
    typeof data.layerId === "string" &&
    typeof data.title === "string" &&
    Array.isArray(data.columns) &&
    Array.isArray(data.rows) &&
    typeof data.totalCount === "number" &&
    Array.isArray(data.objectIds)
  );
}

function isFindAdministrativeFeatureArgs(
  value: unknown
): value is FindAdministrativeFeatureArgs {
  if (!value || typeof value !== "object") {
    return false;
  }

  return typeof (value as Partial<FindAdministrativeFeatureArgs>).targetName === "string";
}

function isQueryAdministrativeLayerArgs(
  value: unknown
): value is QueryAdministrativeLayerArgs {
  if (!value || typeof value !== "object") {
    return false;
  }

  return typeof (value as Partial<QueryAdministrativeLayerArgs>).layerId === "string";
}

function buildScopedMultiLayerResult(
  calls: AssistantToolCall[],
  results: AssistantToolResult[]
): AssistantMultiLayerQueryResultData | null {
  const scopedItems: AssistantQueryResultData[] = [];
  let scopeName: string | undefined;
  let scopeLayerId: string | undefined;

  for (let index = 0; index < calls.length; index += 1) {
    const call = calls[index];
    const result = results[index];

    if (!call || !result?.success) {
      continue;
    }

    if (
      call.tool === "findAdministrativeFeature" &&
      isFindAdministrativeFeatureArgs(call.args) &&
      isAssistantQueryResultData(result.data)
    ) {
      scopeName = call.args.targetName;
      scopeLayerId = result.data.layerId;
    }

    if (
      call.tool === "queryAdministrativeLayer" &&
      isQueryAdministrativeLayerArgs(call.args) &&
      typeof call.args.withinName === "string" &&
      call.args.withinName.trim() &&
      isAssistantQueryResultData(result.data)
    ) {
      if (!scopeName) {
        scopeName = call.args.withinName;
      }

      scopedItems.push(result.data);
    }
  }

  if (scopedItems.length <= 1) {
    return null;
  }

  return {
    scopeName,
    scopeLayerId,
    items: scopedItems.map((item) => ({
      layerId: item.layerId,
      title: item.title,
      totalCount: item.totalCount,
      objectIds: item.objectIds,
      columns: item.columns,
      rows: item.rows,
    })),
    totalLayerCount: scopedItems.length,
    totalFeatureCount: scopedItems.reduce(
      (sum, item) => sum + item.totalCount,
      0
    ),
  };
}

export async function executeToolCalls(
  calls: AssistantToolCall[],
  context: AssistantExecutionContext
): Promise<AssistantToolResult[]> {
  const results: AssistantToolResult[] = [];

  context.session.lastMultiLayerQueryResult = null;

  for (const call of calls) {
    const toolFn = toolRegistry[call.tool];

    if (!toolFn) {
      results.push({
        tool: call.tool,
        success: false,
        message: `Tool "${call.tool}" is not registered.`,
      });
      continue;
    }

    try {
      const result = await toolFn(call.args, context, results);

      results.push({
        tool: call.tool,
        success: true,
        ...result,
      });

      if (
        (call.tool === "queryAdministrativeLayer" ||
          call.tool === "rankAdministrativeRegions" ||
          call.tool === "findAdministrativeFeature") &&
        isAssistantQueryResultData(result.data)
      ) {
        context.session.lastQueryResult = result.data;
        context.session.lastSelectedFeature = {
          layerId: result.data.layerId,
          objectIds: result.data.objectIds,
        };
      }

      if (call.tool === "openAttributeTable" && result.data) {
        context.session.lastAttributeTable = result.data;
      }
    } catch (error) {
      console.error(`Tool execution failed: ${call.tool}`, error);

      results.push({
        tool: call.tool,
        success: false,
        message: `Tool "${call.tool}" failed.`,
      });
    }
  }

  const multiLayerResult = buildScopedMultiLayerResult(calls, results);
  context.session.lastMultiLayerQueryResult = multiLayerResult;

  return results;
}