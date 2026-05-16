import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, like, or, desc } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { riderInputSchema } from "@/lib/schemas";
import { getSession } from "@/lib/auth";

async function requireManagerApi() {
  const { user } = await getSession();
  if (!user || user.role !== "manager") {
    throw Object.assign(new Error("forbidden"), { status: 403 });
  }
  return user;
}

export const ridersRoutes = new Hono()
  .get("/", zValidator("query", z.object({ q: z.string().optional(), status: z.string().optional() })), async (c) => {
    await requireManagerApi();
    const { q, status } = c.req.valid("query");
    const conds = [];
    if (q) conds.push(or(like(schema.riders.fullName, `%${q}%`), like(schema.riders.phone, `%${q}%`)));
    if (status && ["active", "off", "suspended"].includes(status)) {
      conds.push(eq(schema.riders.status, status as "active" | "off" | "suspended"));
    }
    const rows = await db()
      .select()
      .from(schema.riders)
      .where(conds.length ? (conds.length === 1 ? conds[0] : (conds as never)) : undefined)
      .orderBy(desc(schema.riders.createdAt))
      .limit(500);
    return c.json({ riders: rows });
  })

  .post("/", zValidator("json", riderInputSchema), async (c) => {
    const actor = await requireManagerApi();
    const input = c.req.valid("json");
    const id = createId();
    await db().insert(schema.riders).values({ id, ...input });
    await db().insert(schema.auditLog).values({
      id: createId(),
      actorUserId: actor.id,
      action: "create",
      entity: "rider",
      entityId: id,
      diffJson: JSON.stringify(input),
    });
    const [rider] = await db().select().from(schema.riders).where(eq(schema.riders.id, id)).limit(1);
    return c.json({ rider }, 201);
  })

  .get("/:id", async (c) => {
    await requireManagerApi();
    const id = c.req.param("id");
    const [rider] = await db().select().from(schema.riders).where(eq(schema.riders.id, id)).limit(1);
    if (!rider) return c.json({ error: "not_found" }, 404);
    return c.json({ rider });
  })

  .patch("/:id", zValidator("json", riderInputSchema.partial()), async (c) => {
    const actor = await requireManagerApi();
    const id = c.req.param("id");
    const patch = c.req.valid("json");
    await db()
      .update(schema.riders)
      .set({ ...patch, updatedAt: Math.floor(Date.now() / 1000) })
      .where(eq(schema.riders.id, id));
    await db().insert(schema.auditLog).values({
      id: createId(),
      actorUserId: actor.id,
      action: "update",
      entity: "rider",
      entityId: id,
      diffJson: JSON.stringify(patch),
    });

    // If phone changed, rotate any rider sessions tied to old phone
    if (patch.phone) {
      const [linkedUser] = await db().select().from(schema.users).where(eq(schema.users.riderId, id)).limit(1);
      if (linkedUser) {
        await db().update(schema.users).set({ phone: patch.phone }).where(eq(schema.users.id, linkedUser.id));
        await db().delete(schema.sessions).where(eq(schema.sessions.userId, linkedUser.id));
      }
    }

    const [rider] = await db().select().from(schema.riders).where(eq(schema.riders.id, id)).limit(1);
    return c.json({ rider });
  })

  // Rider self-summary (used on /r/home)
  .get("/me/summary", async (c) => {
    const { user } = await getSession();
    if (!user || user.role !== "rider" || !user.riderId) return c.json({ error: "forbidden" }, 403);
    const [rider] = await db().select().from(schema.riders).where(eq(schema.riders.id, user.riderId)).limit(1);
    return c.json({ rider });
  });
