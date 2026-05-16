import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { verifyPassword } from "@/lib/password";
import { createSession, destroySession } from "@/lib/auth";
import { managerLoginSchema, otpRequestSchema, otpVerifySchema } from "@/lib/schemas";

const RATE_KEY = (phone: string) => `otp-rate:${phone}`;
const RATE_LIMIT_PER_HOUR = 5;
const OTP_TTL_SEC = 10 * 60;

export const authRoutes = new Hono()
  .post("/manager/login", zValidator("json", managerLoginSchema), async (c) => {
    const { email, password } = c.req.valid("json");
    const [user] = await db()
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.email, email), eq(schema.users.role, "manager")))
      .limit(1);
    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return c.json({ error: "wrong_credentials" }, 401);
    }
    await createSession(user.id);
    return c.json({ ok: true });
  })

  .post("/logout", async (c) => {
    await destroySession();
    return c.json({ ok: true });
  })

  // Rider OTP: request
  .post("/otp/request", zValidator("json", otpRequestSchema), async (c) => {
    const { phone } = c.req.valid("json");

    // Rate limit
    const rate = parseInt((await env().KV.get(RATE_KEY(phone))) ?? "0", 10);
    if (rate >= RATE_LIMIT_PER_HOUR) return c.json({ error: "rate_limited" }, 429);
    await env().KV.put(RATE_KEY(phone), String(rate + 1), { expirationTtl: 60 * 60 });

    // Confirm a rider exists for this phone — fail fast before paying Twilio
    const [rider] = await db().select().from(schema.riders).where(eq(schema.riders.phone, phone)).limit(1);
    if (!rider) return c.json({ error: "not_found" }, 404);

    // Send via Twilio Verify
    const e = env();
    const url = `https://verify.twilio.com/v2/Services/${e.TWILIO_VERIFY_SERVICE_SID}/Verifications`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${e.TWILIO_ACCOUNT_SID}:${e.TWILIO_AUTH_TOKEN}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: phone, Channel: "sms" }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error("[twilio] verify send failed", resp.status, text);
      return c.json({ error: "send_failed" }, 502);
    }

    return c.json({ ok: true });
  })

  // Rider OTP: verify
  .post("/otp/verify", zValidator("json", otpVerifySchema), async (c) => {
    const { phone, code } = c.req.valid("json");
    const e = env();
    const url = `https://verify.twilio.com/v2/Services/${e.TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${e.TWILIO_ACCOUNT_SID}:${e.TWILIO_AUTH_TOKEN}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: phone, Code: code }),
    });
    if (!resp.ok) return c.json({ error: "invalid_code" }, 400);
    const data = (await resp.json()) as { status?: string };
    if (data.status !== "approved") return c.json({ error: "invalid_code" }, 400);

    // Find rider, auto-provision user if missing
    const [rider] = await db().select().from(schema.riders).where(eq(schema.riders.phone, phone)).limit(1);
    if (!rider) return c.json({ error: "not_found" }, 404);

    let [user] = await db().select().from(schema.users).where(eq(schema.users.phone, phone)).limit(1);
    if (!user) {
      const id = createId();
      await db().insert(schema.users).values({
        id,
        role: "rider",
        phone,
        riderId: rider.id,
        locale: rider.preferredLocale,
      });
      [user] = await db().select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    }
    if (!user) return c.json({ error: "provisioning_failed" }, 500);

    await createSession(user.id);
    return c.json({ ok: true, locale: user.locale });
  });

