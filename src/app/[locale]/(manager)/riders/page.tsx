import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireManager } from "@/lib/rbac";
import { db, schema } from "@/lib/db";
import { desc } from "drizzle-orm";
import Link from "next/link";

export default async function RidersListPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireManager();
  const t = await getTranslations("riders");

  const riders = await db().select().from(schema.riders).orderBy(desc(schema.riders.createdAt)).limit(500);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Link
          href={`/${locale}/riders/new`}
          className="rounded bg-slate-900 px-4 py-2 text-white text-sm"
        >
          {t("new")}
        </Link>
      </header>

      {riders.length === 0 ? (
        <p className="text-slate-500">{t("empty")}</p>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-2 text-left">{t("name")}</th>
                <th className="px-4 py-2 text-left">{t("phone")}</th>
                <th className="px-4 py-2 text-left">{t("status")}</th>
                <th className="px-4 py-2 text-left">{t("bike")}</th>
                <th className="px-4 py-2 text-left">{t("language")}</th>
              </tr>
            </thead>
            <tbody>
              {riders.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2">
                    <Link href={`/${locale}/riders/${r.id}`} className="text-slate-900 hover:underline">
                      {r.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{r.phone}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        r.status === "active"
                          ? "rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs"
                          : r.status === "off"
                            ? "rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-xs"
                            : "rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs"
                      }
                    >
                      {t(
                        r.status === "active"
                          ? "statusActive"
                          : r.status === "off"
                            ? "statusOff"
                            : "statusSuspended",
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{r.bikePlate ?? "—"}</td>
                  <td className="px-4 py-2 uppercase text-xs">{r.preferredLocale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
