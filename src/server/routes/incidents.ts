import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, desc } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db, schema } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { incidentInputSchema } from "@/lib/schemas";
import { getObject } from "@/lib/r2";
import { classifySeverity } from "@/server/ai/classify";
import { extractIncident } from "@/server/ai/incident";

export const incidentsRoutes = new Hono()
  // Rider submits an incident
  .post("/", zValidator("json", incidentInputSchema), async (c) => {
    const { user } = await getSession();
    if (!user || user.role !== "rider" || !user.riderId) return c.json({ error: "forbidden" }, 403);
    const input = c.req.valid("json");

    // Fast severity classification (haiku)
    let severity: "low" | "med" | "high" = "med";
    try {
      const s = await classifySeverity(input.descriptionRaw);
      severity = s.severity;
    } catch (err) {
      console.error("[incidents] classify failed", err);
    }

    const id = createId();
    await db().insert(schema.incidents).values({
      id,
      riderId: user.riderId,
      descriptionRaw: input.descriptionRaw,
      locationText: input.locationText ?? null,
      voiceNoteR2Key: input.voiceNoteKey ?? null,
      severity,
      status: "new",
    });

    for (const key of input.photoKeys) {
      await db().insert(schema.incidentPhotos).values({
        id: createId(),
        incidentId: id,
        r2Key: key,
      });
    }

    // Kick off the heavier extraction asynchronously. In a Worker this would use
    // ctx.waitUntil; in v1 we run it inline (synchronously) for simplicity. Move
    // to a queue when latency becomes an issue.
    try {
      const photos = await Promise.all(
        input.photoKeys.slice(0, 4).map(async (k) => {
          const obj = await getObject(k);
          if (!obj) return null;
          const bytes = await obj.arrayBuffer();
          return { bytes, contentType: obj.httpMetadata?.contentType ?? "image/jpeg" };
        }),
      );
      const filtered = photos.filter((p): p is { bytes: ArrayBuffer; contentType: string } => p !== null);
      const extracted = await extractIncident({ description: input.descriptionRaw, images: filtered });
      await db()
        .update(schema.incidents)
        .set({
          severity: extracted.severity,
          locationText: extracted.location_text ?? input.locationText ?? null,
          thirdPartyInfoJson: JSON.stringify(extracted.third_party_info),
          bikeDamageJson: JSON.stringify(extracted.bike_damage),
          extractedJson: JSON.stringify(extracted),
          insuranceDraftMd: extracted.insurance_draft_md,
          managerAlertMd: extracted.manager_alert_md,
          status: "triaged",
          updatedAt: Math.floor(Date.now() / 1000),
        })
        .where(eq(schema.incidents.id, id));
    } catch (err) {
      console.error("[incidents] extract failed", err);
    }

    return c.json({ id }, 201);
  })

  // Manager: list incidents
  .get("/", async (c) => {
    const { user } = await getSession();
    if (!user || user.role !== "manager") return c.json({ error: "forbidden" }, 403);
    const rows = await db()
      .select()
      .from(schema.incidents)
      .orderBy(desc(schema.incidents.reportedAt))
      .limit(200);
    return c.json({ incidents: rows });
  })

  .get("/:id", async (c) => {
    const { user } = await getSession();
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const id = c.req.param("id");
    const [incident] = await db().select().from(schema.incidents).where(eq(schema.incidents.id, id)).limit(1);
    if (!incident) return c.json({ error: "not_found" }, 404);
    if (user.role === "rider" && incident.riderId !== user.riderId) return c.json({ error: "forbidden" }, 403);
    const photos = await db()
      .select()
      .from(schema.incidentPhotos)
      .where(eq(schema.incidentPhotos.incidentId, id));
    return c.json({ incident, photos });
  });
