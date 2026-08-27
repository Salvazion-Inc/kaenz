"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { t } from "@/lib/copy";
import { useLocale } from "@/lib/locale-context";
import { Site } from "./Site";

export function AuthForm({
  mode,
  googleReason,
}: {
  mode: "login" | "signup";
  googleReason?: string;
}) {
  const { locale } = useLocale();
  const c = t(locale);
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/app";
  const [status, setStatus] = useState<"idle" | "sending" | "err">("idle");
  const [message, setMessage] = useState("");
  const reason =
    googleReason ||
    (search.get("auth") === "google" ? search.get("reason") : null) ||
    (search.get("error") === "google" ? "failed" : null);
  const googleMessage =
    reason === "unconfigured"
      ? c.googleUnconfigured
      : reason === "denied"
        ? c.googleDenied
        : reason
          ? c.googleError
          : "";
  const field =
    "mt-2 w-full rounded-lg border border-navy/15 bg-white px-4 py-3 text-navy outline-none focus:border-kaenz";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    const full_name = String(form.get("full_name") || "");
    const confirm = String(form.get("confirm") || "");
    if (mode === "signup") {
      if (!full_name.trim()) {
        setStatus("err");
        setMessage(c.nameRequired);
        return;
      }
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
    }
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch(
        mode === "login" ? "/api/auth/login" : "/api/auth/signup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, full_name }),
        },
      );
      if (!res.ok) {
        throw new Error("auth");
      }
      router.replace(next.startsWith("/") ? next : "/app");
      router.refresh();
    } catch {
      setStatus("err");
      setMessage(mode === "login" ? c.loginError : c.signupError);
    }
  }

  return (
    <Site locale={locale}>
      <section className="mx-auto max-w-md px-5 pb-24">
        <p className="text-sm text-kaenz">{c.sessionNeeded}</p>
        <h1 className="mt-2 text-4xl font-extrabold">
          {mode === "login" ? c.loginTitle : c.signupTitle}
        </h1>
        <form
          onSubmit={onSubmit}
          className="mt-8 rounded-2xl border border-white/10 bg-white p-6 text-navy"
        >
          {message || googleMessage ? (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {message || googleMessage}
            </div>
          ) : null}
          <a
            href={`/api/auth/google?next=${encodeURIComponent(next)}&from=${mode}`}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-navy/15 bg-white py-3 text-sm font-semibold text-navy hover:border-kaenz"
          >
            <GoogleMark />
            {c.googleCta}
          </a>
          <p className="my-5 text-center text-xs font-semibold uppercase tracking-wider text-navy/40">
            {c.orContinue}
          </p>
          {mode === "signup" ? (
            <label className="block text-sm font-semibold">
              {c.form.name}
              <input className={field} name="full_name" required />
            </label>
          ) : null}
          <label className="mt-4 block text-sm font-semibold">
            {c.form.email}
            <input className={field} type="email" name="email" required />
          </label>
          <label className="mt-4 block text-sm font-semibold">
            {c.password}
            <input
              className={field}
              type="password"
              name="password"
              minLength={8}
              required
            />
          </label>
          {mode === "signup" ? (
            <label className="mt-4 block text-sm font-semibold">
              {c.passwordConfirm}
              <input
                className={field}
                type="password"
                name="confirm"
                minLength={8}
                required
              />
            </label>
          ) : null}
          <button
            type="submit"
            disabled={status === "sending"}
            className="mt-6 w-full rounded-md bg-kaenz py-3 text-lg font-bold text-white disabled:opacity-60"
          >
            {status === "sending"
              ? c.form.sending
              : mode === "login"
                ? c.loginCta
                : c.signupCta}
          </button>
        </form>
        <p className="mt-6 text-sm text-white/70">
          {mode === "login" ? (
            <Link href={`/signup?next=${encodeURIComponent(next)}`} className="text-kaenz">
              {c.needAccount}
            </Link>
          ) : (
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-kaenz">
              {c.haveAccount}
            </Link>
          )}
        </p>
      </section>
    </Site>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 shrink-0">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.76-.07-1.49-.2-2.2H12v4.16h5.4a4.62 4.62 0 0 1-2 3.03v2.5h3.22c1.89-1.74 2.98-4.3 2.98-7.49z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.28l-3.22-2.5c-.9.6-2.04.96-3.4.96-2.61 0-4.83-1.76-5.62-4.13H3.05v2.58A10 10 0 0 0 12 22z"
      />
      <path
        fill="#FBBC05"
        d="M6.38 13.05A6.01 6.01 0 0 1 6.07 12c0-.36.06-.72.1-1.05V8.37H3.05A10 10 0 0 0 2 12c0 1.62.39 3.15 1.05 4.5l3.33-3.45z"
      />
      <path
        fill="#EA4335"
        d="M12 5.82c1.47 0 2.78.5 3.82 1.5l2.86-2.86C16.95 2.89 14.7 2 12 2 7.96 2 4.47 4.3 3.05 8.37l3.33 2.58C7.17 7.58 9.39 5.82 12 5.82z"
      />
    </svg>
  );
}
