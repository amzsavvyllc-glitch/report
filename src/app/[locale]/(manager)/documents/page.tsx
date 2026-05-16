import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireManager } from "@/lib/rbac";
import { db, schema } from "@/lib/db";
import { desc } from "drizzle-orm";

export default async function DocumentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireManager();
  const t = await getTranslations("nav");
  const rows = await db().select().from(schema.documents).orderBy(desc(schema.documents.createdAt)).limit(200);
  return (
    <main className="mx-auto max-w-5xl px-6 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">{t("documents")}</h1>
      {rows.length === 0 ? (
        <p className="text-slate-500">No documents uploaded yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Number</th>
                <th className="px-4 py-2 text-left">Expiry</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2 capitalize">{r.docType.replace("_", " ")}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.docNumber ?? "—"}</td>
                  <td className="px-4 py-2 text-xs">
                    {r.expiryDate ? new Date(r.expiryDate * 1000).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-2 text-xs">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
