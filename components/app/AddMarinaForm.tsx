"use client";

import { useState } from "react";
import { at } from "@/lib/app-copy";
import type { Locale } from "@/lib/locale";
import type { Place } from "@/lib/places";

const field =
  "mt-1.5 w-full rounded-xl border border-navy/10 bg-white px-3 py-2.5 text-sm text-navy outline-none";

const REGIONS = [
  "South Florida",
  "Miami–Fort Lauderdale",
  "Palm Beach",
  "Florida Keys",
  "Caribbean",
  "Mediterranean",
];

export function AddMarinaForm({
  locale,
  onCancel,
  onListed,
}: {
  locale: Locale;
  onCancel: () => void;
  onListed: (place: Place) => void;
}) {
  const c = at(locale).addMarina;
  const [status, setStatus] = useState<"idle" | "sending" | "err">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setMessage("");
    setStatus("sending");
    const data = new FormData(form);
    try {
      const res = await fetch("/api/marinas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: String(data.get("kind") || "marina"),
          name: String(data.get("name") || ""),
          lat: Number(data.get("lat")),
          lng: Number(data.get("lng")),
          address: String(data.get("address") || ""),
          region: String(data.get("region") || ""),
          dockmaster: String(data.get("dockmaster") || ""),
          phone: String(data.get("phone") || ""),
          website: String(data.get("website") || ""),
          wallet: String(data.get("wallet") || ""),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const map: Record<string, string> = {
          auth: c.needAuth,
          wallet: c.needWallet,
          coords: c.needCoords,
          website: c.needUrl,
        };
        throw new Error(map[json.error] || c.error);
      }
      onListed(json.place);
      form.reset();
      setStatus("idle");
    } catch (err) {
      setStatus("err");
      setMessage(err instanceof Error ? err.message : c.error);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-5 space-y-4 rounded-2xl border border-white/10 bg-white p-4 text-navy"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold">{c.title}</h2>
          <p className="mt-1 text-xs text-navy/60">{c.lead}</p>
        </div>
        <button type="button" onClick={onCancel} className="text-xs font-bold text-navy/50">
          {c.cancel}
        </button>
      </div>
      <p className="rounded-lg bg-navy/5 px-3 py-2 text-xs text-navy/70">{c.shareNote}</p>

      <label className="block text-xs font-bold uppercase tracking-wide text-navy/60">
        {c.kind}
        <select className={field} name="kind" defaultValue="marina">
          <option value="marina">{c.marina}</option>
          <option value="port">{c.port}</option>
        </select>
      </label>
      <label className="block text-xs font-bold uppercase tracking-wide text-navy/60">
        {c.name}
        <input className={field} name="name" required />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs font-bold uppercase tracking-wide text-navy/60">
          {c.lat}
          <input className={field} name="lat" type="number" step="any" required />
        </label>
        <label className="block text-xs font-bold uppercase tracking-wide text-navy/60">
          {c.lng}
          <input className={field} name="lng" type="number" step="any" required />
        </label>
      </div>
      <label className="block text-xs font-bold uppercase tracking-wide text-navy/60">
        {c.address}
        <input className={field} name="address" required />
      </label>
      <label className="block text-xs font-bold uppercase tracking-wide text-navy/60">
        {c.region}
        <input className={field} name="region" required list="kaenz-marina-regions" />
        <datalist id="kaenz-marina-regions">
          {REGIONS.map((region) => (
            <option key={region} value={region} />
          ))}
        </datalist>
      </label>
      <label className="block text-xs font-bold uppercase tracking-wide text-navy/60">
        {c.dockmaster}
        <input className={field} name="dockmaster" required />
      </label>
      <label className="block text-xs font-bold uppercase tracking-wide text-navy/60">
        {c.phone}
        <input className={field} name="phone" type="tel" required />
      </label>
      <label className="block text-xs font-bold uppercase tracking-wide text-navy/60">
        {c.website}
        <input className={field} name="website" type="text" placeholder="https://" required />
      </label>
      <label className="block text-xs font-bold uppercase tracking-wide text-navy/60">
        {c.wallet}
        <input className={field} name="wallet" required minLength={32} />
      </label>

      {message ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-xl bg-kaenz py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {status === "sending" ? c.sending : c.submit}
      </button>
    </form>
  );
}
