import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";

// Model selection — keep in one place so cost decisions are visible
export const MODELS = {
  // Multilingual message generation, structured extraction (text+vision), incident drafts
  default: "claude-sonnet-4-6",
  // Cheap, fast classification — used for severity triage
  cheap: "claude-haiku-4-5",
  // Fallback for hard OCR / ambiguous inputs
  strong: "claude-opus-4-7",
} as const;

let _client: Anthropic | null = null;
export function client(): Anthropic {
  if (_client) return _client;
  _client = new Anthropic({ apiKey: env().ANTHROPIC_API_KEY });
  return _client;
}

// ---- Cost guard ----
// Daily spend counter stored in KV. Approximation: we count completed calls
// against AI_DAILY_BUDGET_CENTS using a rough cost-per-call estimate.
// If exceeded, calls throw. Reset via a daily key (YYYY-MM-DD).
const COST_ESTIMATES_CENTS: Record<string, number> = {
  [MODELS.cheap]: 0.5,
  [MODELS.default]: 3,
  [MODELS.strong]: 15,
};

async function recordCost(model: string) {
  const key = `ai-spend:${new Date().toISOString().slice(0, 10)}`;
  const current = parseInt((await env().KV.get(key)) ?? "0", 10);
  const cost = COST_ESTIMATES_CENTS[model] ?? 3;
  const next = current + cost;
  await env().KV.put(key, String(next), { expirationTtl: 60 * 60 * 36 });
  const cap = parseInt(env().AI_DAILY_BUDGET_CENTS ?? "2000", 10);
  if (next > cap) {
    throw new Error(`AI daily budget exceeded (${next} > ${cap} cents). Raise AI_DAILY_BUDGET_CENTS to continue.`);
  }
}

// ---- Cached system prompt helper ----
// Wrap a system prompt so it benefits from Anthropic's prompt caching.
// Any system prompt >= ~1024 tokens (Sonnet/Opus) will be cached and reused
// across calls within the cache window. We mark it cache_control for explicit
// control even on smaller prompts.
export function cachedSystem(text: string): Anthropic.TextBlockParam[] {
  return [
    {
      type: "text",
      text,
      cache_control: { type: "ephemeral" },
    },
  ];
}

// ---- Convenience wrappers ----
export async function callJson<T>(opts: {
  model?: string;
  system: string;
  user: Anthropic.MessageParam["content"];
  maxTokens?: number;
  temperature?: number;
}): Promise<T> {
  const model = opts.model ?? MODELS.default;
  const resp = await client().messages.create({
    model,
    max_tokens: opts.maxTokens ?? 2048,
    temperature: opts.temperature ?? 0.2,
    system: cachedSystem(opts.system),
    messages: [{ role: "user", content: opts.user }],
  });
  await recordCost(model);

  const block = resp.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("No text block in response");
  const text = block.text.trim();
  // Models occasionally wrap JSON in ```json fences; strip them.
  const jsonText = text.replace(/^```(?:json)?\s*|\s*```$/g, "");
  return JSON.parse(jsonText) as T;
}

export async function callText(opts: {
  model?: string;
  system: string;
  user: Anthropic.MessageParam["content"];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const model = opts.model ?? MODELS.default;
  const resp = await client().messages.create({
    model,
    max_tokens: opts.maxTokens ?? 2048,
    temperature: opts.temperature ?? 0.4,
    system: cachedSystem(opts.system),
    messages: [{ role: "user", content: opts.user }],
  });
  await recordCost(model);
  const block = resp.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("No text block in response");
  return block.text;
}
