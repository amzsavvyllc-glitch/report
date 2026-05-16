import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";

export default async function Landing({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("app");
  const a = await getTranslations("auth");

  return (
    <main className="mx-auto max-w-md px-6 py-16 space-y-8">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("name")}</h1>
        <p className="text-slate-600">{t("tagline")}</p>
      </header>
      <div className="space-y-3">
        <Link
          href={`/${locale}/login`}
          className="block w-full rounded-lg bg-slate-900 px-4 py-3 text-center text-white font-medium"
        >
          {a("managerLogin")}
        </Link>
        <Link
          href={`/${locale}/r/login`}
          className="block w-full rounded-lg border border-slate-300 px-4 py-3 text-center font-medium"
        >
          {a("riderLogin")}
        </Link>
      </div>
      <LocaleSwitch current={locale} />
    </main>
  );
}

function LocaleSwitch({ current }: { current: string }) {
  const locales: { code: string; label: string }[] = [
    { code: "en", label: "English" },
    { code: "ur", label: "اردو" },
    { code: "hi", label: "हिन्दी" },
    { code: "bn", label: "বাংলা" },
  ];
  return (
    <div className="flex flex-wrap justify-center gap-2 text-sm text-slate-600">
      {locales.map((l) => (
        <Link
          key={l.code}
          href={`/${l.code}`}
          className={`rounded px-2 py-1 ${l.code === current ? "bg-slate-200" : "hover:bg-slate-100"}`}
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}
