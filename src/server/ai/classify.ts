import { callJson, MODELS } from "./client";
import { SEVERITY_CLASSIFY_SYSTEM } from "./prompts/severity-classify";

export async function classifySeverity(description: string): Promise<{
  severity: "low" | "med" | "high";
  reason: string;
}> {
  return callJson({
    model: MODELS.cheap,
    system: SEVERITY_CLASSIFY_SYSTEM,
    user: description.slice(0, 4000),
    maxTokens: 200,
    temperature: 0,
  });
}
