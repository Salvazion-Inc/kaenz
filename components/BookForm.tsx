"use client";

import { useState } from "react";
import { t } from "@/lib/copy";
import type { Locale } from "@/lib/locale";
import { mapHubs } from "@/lib/places";
import { yachts } from "@/lib/yachts";

export function BookForm({
  locale,
  defaultYacht,
}: {
  locale: Locale;
  defaultYacht?: string;
}) {
  const c = t(locale);
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setStatus("ok");
      setMessage(c.form.success);
      e.currentTarget.reset();
    } catch {
      setStatus("err");
      setMessage(c.formError);
    }
  }

  const field =
    "mt-2 w-full rounded-lg border border-navy/15 bg-white px-4 py-3 text-navy outline-none focus:border-kaenz";

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-white/10 bg-white p-6 text-navy shadow-xl md:p-8"
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
          {c.form.yacht}
          <select
            className={field}
            name="yacht_slug"
            defaultValue={defaultYacht || yachts[0].id}
          >
            {yachts.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name} — {y.marina}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          {c.form.origin}
          <select
            className={field}
            name="origin"
            defaultValue={mapHubs[0]?.name}
          >
            {mapHubs.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name} — {m.city}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          {c.form.destination}
          <select
            className={field}
            name="destination"
            defaultValue={mapHubs[1]?.name || mapHubs[0]?.name}
          >
            {mapHubs.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name} — {m.city}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          {c.form.date}
          <input className={field} type="date" name="trip_date" required />
        </label>
        <label className="block text-sm font-semibold">
          {c.form.time}
          <input className={field} type="time" name="trip_time" required />
        </label>
        <label className="block text-sm font-semibold">
          {c.form.guests}
          <input
            className={field}
            type="number"
            name="guests"
            min={1}
            max={13}
            defaultValue={4}
            required
          />
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
        {status === "sending" ? c.form.sending : c.form.submit}
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
