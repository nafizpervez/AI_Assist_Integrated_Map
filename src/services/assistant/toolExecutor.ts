import type {
  AssistantExecutionContext,
  AssistantToolCall,
  AssistantToolResult,
} from "./toolTypes";

import { toolRegistry } from "./toolRegistry";

export async function executeToolCalls(
  calls: AssistantToolCall[],
  context: AssistantExecutionContext
): Promise<AssistantToolResult[]> {
  const results: AssistantToolResult[] = [];

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
          call.tool === "rankAdministrativeRegions") &&
        result.data
      ) {
        context.session.lastQueryResult =
          result.data as typeof context.session.lastQueryResult;
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

  return results;
}