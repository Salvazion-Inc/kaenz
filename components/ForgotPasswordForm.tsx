"use client";

import Link from "next/link";
import { useState } from "react";
import { t } from "@/lib/copy";
import { useLocale } from "@/lib/locale-context";
import { Site } from "./Site";

export function ForgotPasswordForm() {
  const { locale } = useLocale();
  const c = t(locale);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "err">("idle");
  const [message, setMessage] = useState("");
  const field =
    "mt-2 w-full rounded-lg border border-navy/15 bg-white px-4 py-3 text-navy outline-none focus:border-kaenz";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setMessage("");
    const email = String(new FormData(e.currentTarget).get("email") || "");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (res.status === 429) {
        setStatus("err");
        setMessage(c.verifyResendError);
        return;
      }
      if (!res.ok) {
        setStatus("err");
        setMessage(c.loginError);
        return;
      }
      setStatus("sent");
      setMessage(typeof data.message === "string" ? data.message : c.forgotSent);
    } catch {
      setStatus("err");
      setMessage(c.verifyResendError);
    }
  }

  return (
    <Site locale={locale}>
      <section className="mx-auto max-w-md px-5 pb-24">
        <h1 className="mt-2 text-4xl font-extrabold">{c.forgotTitle}</h1>
        <p className="mt-3 text-sm text-white/70">{c.forgotLead}</p>
        <form
          onSubmit={onSubmit}
          className="mt-8 rounded-2xl border border-white/10 bg-white p-6 text-navy"
        >
          {message ? (
            <div
              role="status"
              className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
                status === "err"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-kaenz/30 bg-kaenz/10 text-navy"
              }`}
            >
              {message}
            </div>
          ) : null}
          <label className="block text-sm font-semibold">
            {c.form.email}
            <input className={field} type="email" name="email" required />
          </label>
          <button
            type="submit"
            disabled={status === "sending"}
            className="mt-6 w-full rounded-md bg-kaenz py-3 text-lg font-bold text-white disabled:opacity-60"
          >
            {status === "sending" ? c.form.sending : c.forgotCta}
          </button>
        </form>
        <p className="mt-6 text-sm text-white/70">
          <Link href="/login" className="font-semibold text-kaenz">
            {c.verifyLogin}
          </Link>
        </p>
      </section>
    </Site>
  );
}
