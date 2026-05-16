import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, desc, lte, gte, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { documentInputSchema } from "@/lib/schemas";
import { getObject } from "@/lib/r2";
import { extractDocument } from "@/server/ai/ocr";

export const documentsRoutes = new Hono()
  // Rider submits a document (after uploading to R2)
  .post("/", zValidator("json", documentInputSchema), async (c) => {
    const { user } = await getSession();
    if (!user || user.role !== "rider" || !user.riderId) return c.json({ error: "forbidden" }, 403);
    const input = c.req.valid("json");
    const id = createId();
    await db().insert(schema.documents).values({
      id,
      riderId: user.riderId,
      docType: input.docType,
      r2Key: input.r2Key,
      contentType: input.contentType,
      status: "pending_ocr",
    });

    // Run OCR inline. For volume, move to a queue + worker.
    try {
      const obj = await getObject(input.r2Key);
      if (!obj) throw new Error("R2 object missing");
      const bytes = await obj.arrayBuffer();
      const ocr = await extractDocument({
        imageBytes: bytes,
        contentType: input.contentType,
        hintedType: input.docType,
      });
      const expiry = ocr.expiry_date ? Math.floor(Date.parse(ocr.expiry_date) / 1000) : null;
      const issued = ocr.issued_date ? Math.floor(Date.parse(ocr.issued_date) / 1000) : null;
      const status: typeof schema.documents.$inferInsert.status =
        ocr.confidence < 0.6 ? "review_needed" : expiry && expiry * 1000 < Date.now() ? "expired" : "ok";
      await db()
        .update(schema.documents)
        .set({
          expiryDate: expiry,
          issuedDate: issued,
          docNumber: ocr.doc_number,
          ocrConfidence: ocr.confidence,
          ocrRawJson: JSON.stringify(ocr),
          status,
          updatedAt: Math.floor(Date.now() / 1000),
        })
        .where(eq(schema.documents.id, id));
    } catch (err) {
      console.error("[documents] ocr failed", err);
      await db().update(schema.documents).set({ status: "review_needed" }).where(eq(schema.documents.id, id));
    }

    return c.json({ id }, 201);
  })

  .get(
    "/",
    zValidator(
      "query",
      z.object({ status: z.string().optional(), withinDays: z.coerce.number().optional() }),
    ),
    async (c) => {
      const { user } = await getSession();
      if (!user || user.role !== "manager") return c.json({ error: "forbidden" }, 403);
      const { status, withinDays } = c.req.valid("query");
      const conds = [];
      if (status === "expiring" && withinDays) {
        const now = Math.floor(Date.now() / 1000);
        const upper = now + withinDays * 86400;
        conds.push(and(gte(schema.documents.expiryDate, now), lte(schema.documents.expiryDate, upper)));
      } else if (status === "expired") {
        conds.push(lte(schema.documents.expiryDate, Math.floor(Date.now() / 1000)));
      } else if (status === "review_needed") {
        conds.push(eq(schema.documents.status, "review_needed"));
      }
      const rows = await db()
        .select()
        .from(schema.documents)
        .where(conds.length === 1 ? conds[0] : undefined)
        .orderBy(desc(schema.documents.expiryDate))
        .limit(500);
      return c.json({ documents: rows });
    },
  )

  // Rider sees own docs
  .get("/mine", async (c) => {
    const { user } = await getSession();
    if (!user || user.role !== "rider" || !user.riderId) return c.json({ error: "forbidden" }, 403);
    const rows = await db()
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.riderId, user.riderId))
      .orderBy(desc(schema.documents.createdAt));
    return c.json({ documents: rows });
  });
