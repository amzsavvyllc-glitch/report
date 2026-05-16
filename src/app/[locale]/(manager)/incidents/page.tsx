import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireManager } from "@/lib/rbac";
import { db, schema } from "@/lib/db";
import { desc } from "drizzle-orm";

export default async function IncidentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireManager();
  const t = await getTranslations("nav");

  const rows = await db().select().from(schema.incidents).orderBy(desc(schema.incidents.reportedAt)).limit(100);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">{t("incidents")}</h1>
      {rows.length === 0 ? (
        <p className="text-slate-500">No incidents yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-2 text-left">Reported</th>
                <th className="px-4 py-2 text-left">Severity</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Description</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2 text-xs">{new Date(r.reportedAt * 1000).toLocaleString()}</td>
                  <td className="px-4 py-2 uppercase text-xs">{r.severity ?? "—"}</td>
                  <td className="px-4 py-2 text-xs">{r.status}</td>
                  <td className="px-4 py-2 max-w-md truncate">{r.descriptionRaw}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
