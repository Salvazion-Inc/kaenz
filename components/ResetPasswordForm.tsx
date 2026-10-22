"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { t } from "@/lib/copy";
import { useLocale } from "@/lib/locale-context";
import { Site } from "./Site";

export function ResetPasswordForm() {
  const { locale } = useLocale();
  const c = t(locale);
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "sending" | "err">("idle");
  const [message, setMessage] = useState("");
  const field =
    "mt-2 w-full rounded-lg border border-navy/15 bg-white px-4 py-3 text-navy outline-none focus:border-kaenz";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");
    if (password.length < 8) {
      setStatus("err");
      setMessage(c.passwordShort);
      return;
    }
    if (password !== confirm) {
      setStatus("err");
      setMessage(c.passwordMismatch);
      return;
    }
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setStatus("err");
        setMessage(typeof data.message === "string" && data.message ? data.message : c.resetError);
        return;
      }
      router.replace("/app");
    } catch {
      setStatus("err");
      setMessage(c.resetError);
    }
  }

  return (
    <Site locale={locale}>
      <section className="mx-auto max-w-md px-5 pb-24">
        <h1 className="mt-2 text-4xl font-extrabold">{c.resetTitle}</h1>
        <form
          onSubmit={onSubmit}
          className="mt-8 rounded-2xl border border-white/10 bg-white p-6 text-navy"
        >
          {message ? (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {message}
            </div>
          ) : null}
          <label className="block text-sm font-semibold">
            {c.password}
            <input className={field} type="password" name="password" minLength={8} required />
          </label>
          <label className="mt-4 block text-sm font-semibold">
            {c.passwordConfirm}
            <input className={field} type="password" name="confirm" minLength={8} required />
          </label>
          <button
            type="submit"
            disabled={status === "sending"}
            className="mt-6 w-full rounded-md bg-kaenz py-3 text-lg font-bold text-white disabled:opacity-60"
          >
            {status === "sending" ? c.form.sending : c.resetCta}
          </button>
        </form>
      </section>
    </Site>
  );
}
