"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { t } from "@/lib/copy";
import { useLocale } from "@/lib/locale-context";
import { Site } from "./Site";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { locale } = useLocale();
  const c = t(locale);
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/app";
  const [status, setStatus] = useState<"idle" | "sending" | "err">("idle");
  const [message, setMessage] = useState("");
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
          {message ? (
            <p className="mt-4 text-sm text-red-600">{message}</p>
          ) : null}
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
