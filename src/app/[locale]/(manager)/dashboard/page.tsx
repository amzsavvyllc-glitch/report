import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireManager } from "@/lib/rbac";
import { db, schema } from "@/lib/db";
import { sql } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ManagerDashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireManager();
  const t = await getTranslations("nav");

  const [ridersCount] = await db().select({ c: sql<number>`count(*)` }).from(schema.riders);
  const [incidentsCount] = await db().select({ c: sql<number>`count(*)` }).from(schema.incidents);
  const [docsCount] = await db().select({ c: sql<number>`count(*)` }).from(schema.documents);

  const cards: { href: string; label: string; value: number }[] = [
    { href: `/${locale}/riders`, label: t("riders"), value: ridersCount?.c ?? 0 },
    { href: `/${locale}/incidents`, label: t("incidents"), value: incidentsCount?.c ?? 0 },
    { href: `/${locale}/documents`, label: t("documents"), value: docsCount?.c ?? 0 },
    { href: `/${locale}/performance`, label: t("performance"), value: 0 },
  ];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("dashboard")}</h1>
        <form action="/api/auth/logout" method="post">
          <button className="text-sm text-slate-600 hover:underline">{t("logout")}</button>
        </form>
      </header>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-lg bg-white p-5 shadow-sm hover:shadow transition"
          >
            <div className="text-3xl font-bold">{c.value}</div>
            <div className="text-sm text-slate-600 mt-1">{c.label}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
