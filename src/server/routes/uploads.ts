import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { makeKey, putObject } from "@/lib/r2";

// v1 uses Worker-proxied uploads (multipart → Worker → R2) for simplicity.
// When traffic warrants it, swap for browser-direct uploads via the S3-compatible
// API + signed PUT URLs (requires R2 access keys and an S3 client).

const presignSchema = z.object({
  kind: z.enum(["incident-photo", "incident-voice", "document"]),
  contentType: z.string().max(200),
  ext: z.string().max(8),
});

export const uploadsRoutes = new Hono()
  .post("/presign", zValidator("json", presignSchema), async (c) => {
    const { user } = await getSession();
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const { kind, ext } = c.req.valid("json");
    const prefix = kind === "incident-photo" ? "incidents/photos" : kind === "incident-voice" ? "incidents/voice" : "documents";
    const key = makeKey(prefix, ext);
    return c.json({ key, uploadUrl: `/api/uploads/direct?key=${encodeURIComponent(key)}` });
  })

  // Direct multipart upload — the client PUTs the file body here
  .put("/direct", async (c) => {
    const { user } = await getSession();
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const key = c.req.query("key");
    if (!key) return c.json({ error: "key_required" }, 400);
    const contentType = c.req.header("content-type") ?? "application/octet-stream";
    const body = await c.req.arrayBuffer();
    await putObject(key, body, contentType);
    return c.json({ ok: true, key });
  });
