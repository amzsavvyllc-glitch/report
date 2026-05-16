import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface CloudflareEnv {
  DB: D1Database;
  FILES: R2Bucket;
  KV: KVNamespace;
  ASSETS: Fetcher;
  ANTHROPIC_API_KEY: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_VERIFY_SERVICE_SID: string;
  SESSION_SECRET: string;
  DEFAULT_COUNTRY_CODE: string;
  AI_DAILY_BUDGET_CENTS: string;
}

export function env(): CloudflareEnv {
  return getCloudflareContext().env as unknown as CloudflareEnv;
}
