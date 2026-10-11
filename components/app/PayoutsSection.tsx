"use client";

import { useEffect, useMemo, useState } from "react";
import { at } from "@/lib/app-copy";
import type { Locale } from "@/lib/locale";

type Status = "none" | "pending" | "restricted" | "unsupported" | "active" | "unavailable";

const COUNTRIES = [
  "US", "ES", "FR", "IT", "GR", "HR", "PT", "MT", "CY", "DE", "NL", "BE",
  "IE", "GB", "CH", "SE", "DK", "NO", "FI", "AT", "PL", "SI", "MX", "CA",
];

const DEFAULT_COUNTRY: Record<Locale, string> = {
  en: "US",
  es: "ES",
  fr: "FR",
  it: "IT",
  pt: "PT",
};

const field =
  "mt-1.5 w-full rounded-xl border border-navy/10 bg-white px-3 py-2.5 text-sm text-navy outline-none";

/** "Receive your earnings": connects the partner's own Stripe account for payouts. */
export function PayoutsSection({ locale }: { locale: Locale }) {
  const p = at(locale).payouts;
  const [status, setStatus] = useState<Status | null>(null);
  const [pendingCents, setPendingCents] = useState(0);
  const [country, setCountry] = useState(DEFAULT_COUNTRY[locale] || "US");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const names = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      return null;
    }
  }, [locale]);

  async function load() {
    try {
      const res = await fetch("/api/payouts", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      setStatus((json.status as Status) || "none");
      setPendingCents(Number(json.pendingCents || 0));
    } catch {
      /* keep the section usable */
    }
  }

  async function connect() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) throw new Error("payouts");
      window.location.assign(String(json.url));
    } catch {
      setBusy(false);
      setError(p.error);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Expired or reused onboarding link: issue a fresh one right away.
    if (params.get("payouts") === "refresh") {
      void connect();
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const label =
    status === "active"
      ? p.statusActive
      : status === "pending"
        ? p.statusPending
        : status === "restricted" || status === "unsupported"
          ? p.statusRestricted
          : status === "unavailable"
            ? p.unavailable
            : p.statusNone;

  const amount = (pendingCents / 100).toLocaleString(locale, {
    style: "currency",
    currency: "USD",
  });

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-kaenz">{p.title}</h2>
      <p className="mt-1 text-xs text-white/50">{p.lead}</p>
      {status ? (
        <p
          className={`mt-3 text-sm font-semibold ${
            status === "active" ? "text-kaenz" : "text-white/80"
          }`}
        >
          {label}
        </p>
      ) : null}
      {pendingCents > 0 && status !== "active" ? (
        <p className="mt-1 text-xs text-white/70">{p.held.replace("{amount}", amount)}</p>
      ) : null}

      {status && status !== "unavailable" ? (
        <>
          {status === "none" ? (
            <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-white/60">
              {p.country}
              <select
                className={field}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                {COUNTRIES.map((code) => (
                  <option key={code} value={code}>
                    {names?.of(code) || code}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button
            type="button"
            onClick={connect}
            disabled={busy}
            className="btn-kaenz mt-4 text-xs disabled:opacity-60"
          >
            {busy
              ? p.opening
              : status === "active"
                ? p.manage
                : status === "none"
                  ? p.connect
                  : p.resume}
          </button>
        </>
      ) : null}
      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
    </section>
  );
}

/** Notice shown on the listing forms: publishing works without Stripe, payouts need it. */
export function PayoutsNotice({ locale }: { locale: Locale }) {
  const p = at(locale).payouts;
  return (
    <p className="rounded-lg bg-navy/5 px-3 py-2 text-xs text-navy/70">
      {p.listingNotice}{" "}
      <a href="/app/account" className="font-bold underline">
        {p.listingNoticeCta}
      </a>
    </p>
  );
}
