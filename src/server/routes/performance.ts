import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { makeKey, putObject } from "@/lib/r2";
import { parseKeetaCsv } from "@/lib/csv";
import { generatePerformanceMessages } from "@/server/ai/messages";

async function requireManager() {
  const { user } = await getSession();
  if (!user || user.role !== "manager") throw Object.assign(new Error("forbidden"), { status: 403 });
  return user;
}

export const performanceRoutes = new Hono()
  // Upload a Keeta CSV — multipart form with field "file"
  .post("/uploads", async (c) => {
    const actor = await requireManager();
    const form = await c.req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return c.json({ error: "file_required" }, 400);

    const r2Key = makeKey("performance", "csv");
    const bytes = await file.arrayBuffer();
    await putObject(r2Key, bytes, "text/csv");

    const text = new TextDecoder("utf-8").decode(bytes);
    const rows = parseKeetaCsv(text);

    const uploadId = createId();
    await db().insert(schema.performanceUploads).values({
      id: uploadId,
      uploadedBy: actor.id,
      source: "keeta_csv",
      r2Key,
      rowCount: rows.length,
      status: "parsed",
    });

    // Match each row to a rider by name or phone (best-effort)
    const allRiders = await db().select().from(schema.riders);
    const byPhone = new Map(allRiders.map((r) => [r.phone, r]));
    const byName = new Map(allRiders.map((r) => [r.fullName.toLowerCase().trim(), r]));

    const inserts = rows.map((row) => {
      let riderId: string | null = null;
      if (row.riderPhoneRaw && byPhone.has(row.riderPhoneRaw)) {
        riderId = byPhone.get(row.riderPhoneRaw)!.id;
      } else if (row.riderNameRaw && byName.has(row.riderNameRaw.toLowerCase().trim())) {
        riderId = byName.get(row.riderNameRaw.toLowerCase().trim())!.id;
      }
      return {
        id: createId(),
        uploadId,
        riderId,
        externalRiderRef: row.externalRiderRef,
        orders: row.orders,
        onTimePct: row.onTimePct,
        avgDeliveryMin: row.avgDeliveryMin,
        cancellations: row.cancellations,
        customerRating: row.customerRating,
        earningsCents: row.earningsCents,
        rawJson: JSON.stringify(row.raw),
      };
    });

    if (inserts.length) {
      // D1 batches are capped — chunk to be safe
      const CHUNK = 50;
      for (let i = 0; i < inserts.length; i += CHUNK) {
        await db().insert(schema.performanceRows).values(inserts.slice(i, i + CHUNK));
      }
    }

    return c.json({ uploadId, rowCount: inserts.length, unmatched: inserts.filter((r) => !r.riderId).length });
  })

  .get("/uploads/:id/rows", async (c) => {
    await requireManager();
    const uploadId = c.req.param("id");
    const rows = await db()
      .select()
      .from(schema.performanceRows)
      .where(eq(schema.performanceRows.uploadId, uploadId));
    return c.json({ rows });
  })

  // Generate localized messages for one row
  .post("/rows/:id/generate", async (c) => {
    await requireManager();
    const rowId = c.req.param("id");
    const [row] = await db().select().from(schema.performanceRows).where(eq(schema.performanceRows.id, rowId)).limit(1);
    if (!row) return c.json({ error: "not_found" }, 404);

    let firstName = "Rider";
    if (row.riderId) {
      const [rider] = await db().select().from(schema.riders).where(eq(schema.riders.id, row.riderId)).limit(1);
      if (rider) firstName = rider.fullName.split(/\s+/)[0];
    }

    const msgs = await generatePerformanceMessages({
      riderFirstName: firstName,
      periodLabel: "this period",
      stats: {
        orders: row.orders,
        onTimePct: row.onTimePct,
        avgDeliveryMin: row.avgDeliveryMin,
        cancellations: row.cancellations,
        customerRating: row.customerRating,
      },
    });

    await db()
      .update(schema.performanceRows)
      .set({
        generatedMessageEn: msgs.en,
        generatedMessageUr: msgs.ur,
        generatedMessageHi: msgs.hi,
        generatedMessageBn: msgs.bn,
        generatedAt: Math.floor(Date.now() / 1000),
      })
      .where(eq(schema.performanceRows.id, rowId));

    return c.json({ messages: msgs });
  })

  .get("/uploads", zValidator("query", z.object({ limit: z.coerce.number().optional() })), async (c) => {
    await requireManager();
    const limit = c.req.valid("query").limit ?? 50;
    const uploads = await db().select().from(schema.performanceUploads).limit(limit);
    return c.json({ uploads });
  });
