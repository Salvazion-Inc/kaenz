"use client";

import { useState } from "react";
import { t } from "@/lib/copy";
import type { Locale } from "@/lib/locale";

export function JoinForm({ locale }: { locale: Locale }) {
  const c = t(locale);
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const field =
    "mt-2 w-full rounded-lg border border-navy/15 bg-white px-4 py-3 text-navy outline-none focus:border-kaenz";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(form.entries()), locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error("join");
      setStatus("ok");
      setMessage(c.joinSuccess);
      e.currentTarget.reset();
    } catch {
      setStatus("err");
      setMessage(c.formError);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-white/10 bg-white p-6 text-navy md:p-8"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block text-sm font-semibold">
          {c.form.name}
          <input className={field} name="full_name" required />
        </label>
        <label className="block text-sm font-semibold">
          {c.form.email}
          <input className={field} type="email" name="email" required />
        </label>
        <label className="block text-sm font-semibold">
          {c.form.phone}
          <input className={field} name="phone" type="tel" />
        </label>
        <label className="block text-sm font-semibold">
          {c.role}
          <select className={field} name="role" defaultValue="captain">
            <option value="owner">{c.owner}</option>
            <option value="captain">{c.captain}</option>
            <option value="both">{c.both}</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">
          {c.yachtName}
          <input className={field} name="yacht_name" />
        </label>
        <label className="block text-sm font-semibold">
          {c.uscg}
          <input className={field} name="uscg_license" />
        </label>
        <label className="block text-sm font-semibold md:col-span-2">
          {c.form.notes}
          <textarea className={field} name="notes" rows={3} />
        </label>
      </div>
      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-6 w-full rounded-md bg-kaenz py-3 text-lg font-bold text-white hover:bg-kaenz-deep disabled:opacity-60"
      >
        {status === "sending" ? c.form.sending : c.submitJoin}
      </button>
      {message ? (
        <p
          className={`mt-4 text-sm ${status === "ok" ? "text-kaenz-deep" : "text-red-600"}`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
