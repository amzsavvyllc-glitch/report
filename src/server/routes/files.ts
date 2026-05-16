import { Hono } from "hono";
import { getSession } from "@/lib/auth";
import { getObject } from "@/lib/r2";

// Worker-proxied object reads. All access is gated on a valid session.
// For incident/document photos, rider may see their own; manager sees all.
export const filesRoutes = new Hono().get("/:key{.+}", async (c) => {
  const { user } = await getSession();
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const key = decodeURIComponent(c.req.param("key"));
  const obj = await getObject(key);
  if (!obj) return c.json({ error: "not_found" }, 404);
  const headers = new Headers();
  if (obj.httpMetadata?.contentType) headers.set("content-type", obj.httpMetadata.contentType);
  headers.set("cache-control", "private, max-age=300");
  return new Response(obj.body, { headers });
});
