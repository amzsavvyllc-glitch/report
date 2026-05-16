import { callJson, MODELS } from "./client";
import { MESSAGE_GENERATE_SYSTEM, messageUserPayload, type MessageInput } from "./prompts/message-generate";

export interface LocalizedMessages {
  en: string;
  ur: string;
  hi: string;
  bn: string;
}

export async function generatePerformanceMessages(input: MessageInput): Promise<LocalizedMessages> {
  return callJson<LocalizedMessages>({
    model: MODELS.default,
    system: MESSAGE_GENERATE_SYSTEM,
    user: messageUserPayload(input),
    maxTokens: 1500,
    temperature: 0.5,
  });
}
