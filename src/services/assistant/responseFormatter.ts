import type {
  AssistantAgent,
  AssistantIntent,
  AssistantResponse,
} from "../../types/assistant";

interface FormatResponseParams {
  prompt: string;
  answer: string;
  agent: AssistantAgent;
  intent: AssistantIntent;
  success: boolean;
  matchedLayer?: string | null;
}

export function formatAssistantResponse(
  params: FormatResponseParams
): AssistantResponse {
  return {
    prompt: params.prompt,
    answer: params.answer,
    agent: params.agent,
    intent: params.intent,
    success: params.success,
    matchedLayer: params.matchedLayer ?? null,
  };
}