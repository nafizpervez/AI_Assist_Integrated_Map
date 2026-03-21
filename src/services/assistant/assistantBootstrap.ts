import type {
  AssistantAttributeTable,
  AssistantResponse,
} from "../../types/assistant";
import type {
  AssistantExecutionContext,
  AssistantMultiLayerQueryItem,
  AssistantQueryResultData,
  AssistantSessionState,
  AssistantToolResult,
} from "./toolTypes";
import { getFeatureLayerById, queryAllFeatures } from "../arcgis/query/featureSearch";

import type Map from "@arcgis/core/Map";
import type MapView from "@arcgis/core/views/MapView";
import { buildToolPlanFromPrompt } from "./intentRouter";
import { executeToolCalls } from "./toolExecutor";

// import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";

interface RunAssistantPromptParams {
  prompt: string;
  map: Map | null;
  view: MapView | null;
  session: AssistantSessionState;
}

function buildAnswerFromToolResults(results: AssistantToolResult[]): string {
  const messages = results
    .map((item: AssistantToolResult) => item.message?.trim())
    .filter((value): value is string => Boolean(value));

  if (!messages.length) {
    return "Done.";
  }

  return messages.join("\n");
}

function normalizeTableValue(
  value: unknown
): string | number | boolean | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return String(value);
}

function buildAttributeTableFromQueryResult(
  queryResult: AssistantQueryResultData
): AssistantAttributeTable {
  const baseTitle = queryResult.title?.trim() || queryResult.layerId;
  const title = baseTitle.toLowerCase().includes("attribute table")
    ? baseTitle
    : `${baseTitle} Attribute Table`;

  return {
    title,
    layerId: queryResult.layerId,
    columns: queryResult.columns,
    rows: queryResult.rows as Record<string, unknown>[],
    totalCount: queryResult.totalCount,
    shownCount: queryResult.rows.length,
  };
}

function buildAttributeTableFromMultiLayerItem(
  item: AssistantMultiLayerQueryItem
): AssistantAttributeTable {
  const baseTitle = item.title?.trim() || item.layerId;
  const title = baseTitle.toLowerCase().includes("attribute table")
    ? baseTitle
    : `${baseTitle} Attribute Table`;

  return {
    title,
    layerId: item.layerId,
    columns: item.columns,
    rows: item.rows as Record<string, unknown>[],
    totalCount: item.totalCount,
    shownCount: item.rows.length,
  };
}

async function buildBangladeshBoundaryScopedTable(
  map: Map
): Promise<AssistantAttributeTable | null> {
  const boundaryLayer = getFeatureLayerById(map, "bd-boundary");

  if (!boundaryLayer) {
    return null;
  }

  await boundaryLayer.load();

  const features = await queryAllFeatures(boundaryLayer);

  if (!features.length) {
    return null;
  }

  const rows = features.slice(0, 1).map((feature) => {
    const attributes = feature.attributes ?? {};
    const row: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(attributes)) {
      row[key] = normalizeTableValue(value);
    }

    return row;
  });

  const columns =
    rows[0] != null
      ? Object.keys(rows[0])
      : boundaryLayer.fields?.map((field) => field.name).filter(Boolean) ?? [];

  const baseTitle = boundaryLayer.title?.trim() || boundaryLayer.id;
  const title = baseTitle.toLowerCase().includes("attribute table")
    ? baseTitle
    : `${baseTitle} Attribute Table`;

  return {
    title,
    layerId: boundaryLayer.id,
    columns,
    rows,
    totalCount: rows.length,
    shownCount: rows.length,
  };
}

function dedupeTables(
  tables: AssistantAttributeTable[]
): AssistantAttributeTable[] {
  const seen = new Set<string>();
  const result: AssistantAttributeTable[] = [];

  for (const table of tables) {
    const key = `${table.layerId}__${table.title}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(table);
  }

  return result;
}

async function buildAvailableAttributeTables(
  map: Map | null,
  session: AssistantSessionState,
  explicitTable: AssistantAttributeTable | null
): Promise<AssistantAttributeTable[]> {
  const tables: AssistantAttributeTable[] = [];

  if (explicitTable) {
    tables.push(explicitTable);
  }

  if (session.lastMultiLayerQueryResult?.items?.length) {
    for (const item of session.lastMultiLayerQueryResult.items) {
      tables.push(buildAttributeTableFromMultiLayerItem(item));
    }

    if (map) {
      try {
        const boundaryTable = await buildBangladeshBoundaryScopedTable(map);
        if (boundaryTable) {
          tables.push(boundaryTable);
        }
      } catch (error) {
        console.error("Failed to build Bangladesh Boundary scoped table.", error);
      }
    }

    return dedupeTables(tables);
  }

  if (session.lastQueryResult) {
    tables.push(buildAttributeTableFromQueryResult(session.lastQueryResult));
  }

  return dedupeTables(tables);
}

export async function runAssistantPrompt({
  prompt,
  map,
  view,
  session,
}: RunAssistantPromptParams): Promise<AssistantResponse> {
  const plan = buildToolPlanFromPrompt(prompt);

  if (!plan.length) {
    return {
      prompt,
      answer:
        "I understood the prompt, but I do not yet have a tool flow for it.",
      agent: "toolBasedAssistant",
      intent: "unknown",
      success: false,
      matchedLayer: null,
      meta: null,
      attributeTable: null,
      availableAttributeTables: [],
    };
  }

  const executionContext: AssistantExecutionContext = {
    prompt,
    map,
    view,
    session,
  };

  const toolResults = await executeToolCalls(plan, executionContext);

  const firstFailure = toolResults.find(
    (item: AssistantToolResult) => !item.success
  );

  if (firstFailure) {
    return {
      prompt,
      answer: firstFailure.message ?? "One of the assistant tools failed.",
      agent: "toolBasedAssistant",
      intent: "toolExecution",
      success: false,
      matchedLayer: null,
      meta: { toolResults },
      attributeTable: null,
      availableAttributeTables: [],
    };
  }

  const tableResult = toolResults.find(
    (item: AssistantToolResult) =>
      item.tool === "openAttributeTable" && Boolean(item.data)
  );

  const explicitTable =
    (tableResult?.data as AssistantAttributeTable | undefined) ?? null;

  return {
    prompt,
    answer: buildAnswerFromToolResults(toolResults),
    agent: "toolBasedAssistant",
    intent: "toolExecution",
    success: true,
    matchedLayer: executionContext.session.lastQueryResult?.layerId ?? null,
    meta: { toolResults },
    attributeTable: explicitTable,
    availableAttributeTables: await buildAvailableAttributeTables(
      map,
      executionContext.session,
      explicitTable
    ),
  };
}