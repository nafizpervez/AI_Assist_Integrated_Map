import type {
  AssistantAgent,
  AssistantIntent,
  AssistantResponse,
  AssistantResponseMeta,
} from "../../types/assistant";

interface FormatResponseParams {
  prompt: string;
  answer?: string;
  agent: AssistantAgent;
  intent: AssistantIntent;
  success: boolean;
  matchedLayer?: string | null;
  meta?: AssistantResponseMeta | null;
}

function formatNumber(value: string | number | undefined) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return value.toLocaleString("en-US");
  }

  const numeric = Number(value);
  if (!Number.isNaN(numeric) && value.trim() !== "") {
    return numeric.toLocaleString("en-US");
  }

  return value;
}

function toDisplayEntityType(entityType?: string) {
  if (!entityType || entityType === "unknown") {
    return "";
  }

  return entityType.charAt(0).toUpperCase() + entityType.slice(1);
}

function buildDynamicAnswer(meta?: AssistantResponseMeta | null) {
  if (!meta) {
    return null;
  }

  const entityName = meta.entityName?.trim();
  const entityType = toDisplayEntityType(meta.entityType);
  const metricValue = formatNumber(meta.metricValue);
  const rankDirection = meta.rankDirection;
  const metric = meta.metric;

  if (
    entityName &&
    metric === "population" &&
    metricValue &&
    (rankDirection === "highest" || rankDirection === "lowest")
  ) {
    const entityLabel = entityType ? ` ${entityType}` : "";
    return `${entityName}${entityLabel} has the ${rankDirection} population, with a total population of ${metricValue}.`;
  }

  return null;
}

export function formatAssistantResponse(
  params: FormatResponseParams
): AssistantResponse {
  const dynamicAnswer = buildDynamicAnswer(params.meta);

  return {
    prompt: params.prompt,
    answer: dynamicAnswer ?? params.answer ?? "Request completed.",
    agent: params.agent,
    intent: params.intent,
    success: params.success,
    matchedLayer: params.matchedLayer ?? null,
    meta: params.meta ?? null,
  };
}