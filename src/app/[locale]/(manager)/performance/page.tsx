import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireManager } from "@/lib/rbac";

export default async function PerformancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireManager();
  const t = await getTranslations("nav");
  return (
    <main className="mx-auto max-w-4xl px-6 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">{t("performance")}</h1>
      <p className="text-slate-600">
        CSV upload + AI message generation lands in Phase 3. The API is already wired —
        <code className="mx-1 rounded bg-slate-100 px-1 py-0.5 text-sm">POST /api/performance/uploads</code>
        accepts a multipart Keeta export and
        <code className="mx-1 rounded bg-slate-100 px-1 py-0.5 text-sm">POST /api/performance/rows/:id/generate</code>
        returns localized WhatsApp messages.
      </p>
    </main>
  );
}
