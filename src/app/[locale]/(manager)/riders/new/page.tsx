"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function NewRiderPage() {
  const t = useTranslations("riders");
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    phone: "+966",
    nationalId: "",
    status: "active",
    bikePlate: "",
    preferredLocale: "en",
  });
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const resp = await fetch("/api/riders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!resp.ok) {
      const data = (await resp.json().catch(() => null)) as { error?: string } | null;
      setErr(data?.error ?? "Failed");
      return;
    }
    router.push("../riders");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-md px-6 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">{t("new")}</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label={t("name")}>
          <input
            required
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </Field>
        <Field label={t("phone")}>
          <input
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full rounded border border-slate-300 px-3 py-2 font-mono"
            placeholder="+9665XXXXXXXX"
          />
        </Field>
        <Field label="National ID / Iqama">
          <input
            value={form.nationalId}
            onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </Field>
        <Field label={t("bike")}>
          <input
            value={form.bikePlate}
            onChange={(e) => setForm({ ...form, bikePlate: e.target.value })}
            className="w-full rounded border border-slate-300 px-3 py-2 font-mono"
          />
        </Field>
        <Field label={t("language")}>
          <select
            value={form.preferredLocale}
            onChange={(e) => setForm({ ...form, preferredLocale: e.target.value })}
            className="w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="en">English</option>
            <option value="ur">اردو</option>
            <option value="hi">हिन्दी</option>
            <option value="bn">বাংলা</option>
          </select>
        </Field>
        <Field label={t("status")}>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="active">{t("statusActive")}</option>
            <option value="off">{t("statusOff")}</option>
            <option value="suspended">{t("statusSuspended")}</option>
          </select>
        </Field>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button disabled={loading} className="w-full rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
          {t("new")}
        </button>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
