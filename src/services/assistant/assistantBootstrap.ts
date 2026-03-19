import type {
  AssistantExecutionContext,
  AssistantSessionState,
  AssistantToolResult,
} from "./toolTypes";

import type { AssistantResponse } from "../../types/assistant";
import type Map from "@arcgis/core/Map";
import type MapView from "@arcgis/core/views/MapView";
import { buildToolPlanFromPrompt } from "./intentRouter";
import { executeToolCalls } from "./toolExecutor";

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
    };
  }

  const tableResult = toolResults.find(
    (item: AssistantToolResult) =>
      item.tool === "openAttributeTable" && Boolean(item.data)
  );

  return {
    prompt,
    answer: buildAnswerFromToolResults(toolResults),
    agent: "toolBasedAssistant",
    intent: "toolExecution",
    success: true,
    matchedLayer: executionContext.session.lastQueryResult?.layerId ?? null,
    meta: { toolResults },
    attributeTable:
      (tableResult?.data as AssistantResponse["attributeTable"]) ?? null,
  };
}