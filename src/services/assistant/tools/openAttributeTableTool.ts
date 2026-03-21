import type {
  AssistantExecutionContext,
  AssistantQueryResultData,
  AssistantToolArgs,
  AssistantToolResult,
  OpenAttributeTableArgs,
} from "../toolTypes";

import type { AssistantAttributeTable } from "../../../types/assistant";

function buildTableTitle(queryResult: AssistantQueryResultData): string {
  const baseTitle = queryResult.title?.trim() || queryResult.layerId;

  if (baseTitle.toLowerCase().includes("attribute table")) {
    return baseTitle;
  }

  return `${baseTitle} Attribute Table`;
}

export async function openAttributeTableTool(
  rawArgs: AssistantToolArgs,
  context: AssistantExecutionContext,
  _previousResults: AssistantToolResult[]
): Promise<Omit<AssistantToolResult, "tool" | "success">> {
  const args = rawArgs as OpenAttributeTableArgs;

  let sourceResult: AssistantQueryResultData | null = null;

  if (args.source === "lastQueryResult") {
    sourceResult = context.session.lastQueryResult;
  }

  if (!sourceResult) {
    return {
      message: "There is no previous query result available to open as a table.",
      data: null,
    };
  }

  const attributeTable: AssistantAttributeTable = {
    title: buildTableTitle(sourceResult),
    layerId: sourceResult.layerId,
    columns: sourceResult.columns,
    rows: sourceResult.rows as Record<string, unknown>[],
    totalCount: sourceResult.totalCount,
    shownCount: sourceResult.rows.length,
  };

  context.session.lastAttributeTable = attributeTable;

  return {
    message: `Opened ${attributeTable.title} with ${attributeTable.shownCount} row(s).`,
    data: attributeTable,
  };
}