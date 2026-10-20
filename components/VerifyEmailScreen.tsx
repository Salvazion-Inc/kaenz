"use client";

import { useState } from "react";
import { t } from "@/lib/copy";
import { useLocale } from "@/lib/locale-context";

export function VerifyEmailScreen({ email }: { email?: string }) {
  const { locale } = useLocale();
  const c = t(locale);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "err">("idle");

  async function resend() {
    setStatus("sending");
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(email ? { email } : {}),
      });
      if (!res.ok) throw new Error("resend");
      setStatus("sent");
    } catch {
      setStatus("err");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.assign("/login");
  }

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-5 py-16 text-white">
      <p className="text-sm font-semibold text-kaenz">{c.verifyTitle}</p>
      <h1 className="mt-2 text-4xl font-extrabold">{c.verifyTitle}</h1>
      <p className="mt-4 text-white/75">{c.verifyBody}</p>
      {email ? <p className="mt-3 text-sm text-white/55">{email}</p> : null}
      <button
        type="button"
        onClick={resend}
        disabled={status === "sending"}
        className="mt-8 rounded-md bg-kaenz py-3 text-lg font-bold text-white disabled:opacity-60"
      >
        {status === "sending" ? c.form.sending : c.verifyResend}
      </button>
      {status === "sent" ? (
        <p className="mt-4 text-sm text-kaenz" role="status">
          {c.verifyResent}
        </p>
      ) : null}
      {status === "err" ? (
        <p className="mt-4 text-sm text-red-300" role="alert">
          {c.verifyResendError}
        </p>
      ) : null}
      <button
        type="button"
        onClick={logout}
        className="mt-6 text-sm font-semibold text-white/70 underline-offset-4 hover:underline"
      >
        {c.nav.logout}
      </button>
    </section>
  );
}
