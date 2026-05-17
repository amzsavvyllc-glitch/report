import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireRider } from "@/lib/rbac";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function RiderHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireRider();
  const t = await getTranslations("home");

  const [rider] = user.riderId
    ? await db().select().from(schema.riders).where(eq(schema.riders.id, user.riderId)).limit(1)
    : [];

  return (
    <main className="mx-auto max-w-md px-6 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">{t("welcome", { name: rider?.fullName?.split(/\s+/)[0] ?? "" })}</h1>
      <div className="space-y-3">
        <Link
          href={`/${locale}/r/incident/new`}
          className="block w-full rounded-lg bg-red-600 px-4 py-4 text-center text-white font-semibold"
        >
          {t("reportIncident")}
        </Link>
        <Link
          href={`/${locale}/r/documents`}
          className="block w-full rounded-lg border border-slate-300 px-4 py-4 text-center font-medium"
        >
          {t("myDocuments")}
        </Link>
      </div>
    </main>
  );
}
