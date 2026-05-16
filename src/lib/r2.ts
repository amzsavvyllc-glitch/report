import { env } from "./env";
import { createId } from "@paralleldrive/cuid2";

const ONE_HOUR = 60 * 60;

export function makeKey(prefix: string, ext: string): string {
  const id = createId();
  const ymd = new Date().toISOString().slice(0, 10);
  return `${prefix}/${ymd}/${id}.${ext}`;
}

export async function putObject(key: string, body: ArrayBuffer | ReadableStream, contentType: string) {
  await env().FILES.put(key, body, { httpMetadata: { contentType } });
}

export async function getObject(key: string): Promise<R2ObjectBody | null> {
  return env().FILES.get(key);
}

export async function deleteObject(key: string) {
  await env().FILES.delete(key);
}

// Returns a Worker-served URL that proxies the object. R2 doesn't support
// browser-direct presigned URLs without a custom domain + S3 API; for v1 we
// serve through the Worker, which is fine at this scale.
export function objectUrl(key: string): string {
  return `/api/files/${encodeURIComponent(key)}`;
}

export { ONE_HOUR };
