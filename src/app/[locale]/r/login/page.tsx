"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function RiderLoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [phone, setPhone] = useState("+966");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const resp = await fetch("/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    setLoading(false);
    if (resp.status === 429) return setErr(t("rateLimited"));
    if (resp.status === 404) return setErr(t("notFound"));
    if (!resp.ok) return setErr("Failed to send code");
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const resp = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
    setLoading(false);
    if (!resp.ok) return setErr(t("rateLimited"));
    router.push("./home");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-12 space-y-6">
      <h1 className="text-2xl font-semibold">{t("riderLogin")}</h1>
      {step === "phone" ? (
        <form onSubmit={sendCode} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">{t("phone")}</span>
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 font-mono"
              placeholder="+9665XXXXXXXX"
            />
          </label>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button disabled={loading} className="w-full rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
            {t("sendCode")}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">{t("code")}</span>
            <input
              required
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 font-mono text-2xl tracking-widest text-center"
            />
          </label>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button disabled={loading} className="w-full rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
            {t("verify")}
          </button>
        </form>
      )}
    </main>
  );
}
