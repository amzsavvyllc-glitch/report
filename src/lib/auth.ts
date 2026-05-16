import { Lucia, TimeSpan } from "lucia";
import { D1Adapter } from "@lucia-auth/adapter-sqlite";
import { cookies } from "next/headers";
import { cache } from "react";
import { env } from "./env";
import type { User as DbUser } from "../../drizzle/schema";

function lucia() {
  const adapter = new D1Adapter(env().DB, {
    user: "users",
    session: "sessions",
  });
  return new Lucia(adapter, {
    sessionExpiresIn: new TimeSpan(30, "d"),
    sessionCookie: {
      attributes: { secure: process.env.NODE_ENV === "production" },
    },
    getUserAttributes: (attrs) => ({
      role: attrs.role,
      email: attrs.email,
      phone: attrs.phone,
      locale: attrs.locale,
      riderId: attrs.riderId,
    }),
  });
}

declare module "lucia" {
  interface Register {
    Lucia: ReturnType<typeof lucia>;
    DatabaseUserAttributes: Pick<DbUser, "role" | "email" | "phone" | "locale" | "riderId">;
  }
}

export const getSession = cache(async () => {
  const auth = lucia();
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(auth.sessionCookieName)?.value ?? null;
  if (!sessionId) return { user: null, session: null };

  const { session, user } = await auth.validateSession(sessionId);
  try {
    if (session && session.fresh) {
      const cookie = auth.createSessionCookie(session.id);
      cookieStore.set(cookie.name, cookie.value, cookie.attributes);
    }
    if (!session) {
      const cookie = auth.createBlankSessionCookie();
      cookieStore.set(cookie.name, cookie.value, cookie.attributes);
    }
  } catch {
    // Cookie mutation can fail in RSC; safe to ignore — middleware refreshes next request.
  }
  return { user, session };
});

export async function createSession(userId: string) {
  const auth = lucia();
  const session = await auth.createSession(userId, {});
  const cookie = auth.createSessionCookie(session.id);
  const cookieStore = await cookies();
  cookieStore.set(cookie.name, cookie.value, cookie.attributes);
  return session;
}

export async function destroySession() {
  const auth = lucia();
  const { session } = await getSession();
  if (session) await auth.invalidateSession(session.id);
  const cookie = auth.createBlankSessionCookie();
  const cookieStore = await cookies();
  cookieStore.set(cookie.name, cookie.value, cookie.attributes);
}

export { lucia };
