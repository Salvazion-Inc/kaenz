"use client";

import { useMemo, useState } from "react";
import { t } from "@/lib/copy";
import type { Locale } from "@/lib/locale";
import { mapHubs, placeById, placeCountry } from "@/lib/places";
import {
  DEFAULT_HOURS,
  defaultHoursFor,
  estimateFare,
  type TripKind,
} from "@/lib/pricing";
import { formatUsd, yachtById, yachts } from "@/lib/yachts";

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
  const [kind, setKind] = useState<TripKind>("tour");
  const [yachtId, setYachtId] = useState(defaultYacht || yachts[0].id);
  const [hours, setHours] = useState(DEFAULT_HOURS.tour);
  const [guests, setGuests] = useState(4);
  const [date, setDate] = useState("");
  const [originId, setOriginId] = useState(mapHubs[0]?.id || "");
  const [destinationId, setDestinationId] = useState(
    mapHubs[1]?.id || mapHubs[0]?.id || "",
  );

  const quote = useMemo(() => {
    const yacht = yachtById(yachtId);
    if (!yacht) return null;
    return estimateFare(yacht, kind, {
      hours,
      guests,
      date,
      origin: placeById(originId),
      destination: placeById(destinationId),
    });
  }, [yachtId, kind, hours, guests, date, originId, destinationId]);

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
          {c.form.kind}
          <select
            className={field}
            name="trip_kind"
            value={kind}
            onChange={(e) => {
              const next = e.target.value as TripKind;
              setKind(next);
              setHours(defaultHoursFor(next, yachtById(yachtId)));
            }}
          >
            {(["commute", "tour", "special"] as const).map((k, i) => (
              <option key={k} value={k}>
                {c.tripTypes[i].title}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          {c.form.duration}
          <input
            className={field}
            type="number"
            name="hours"
            min={1}
            max={12}
            required
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
          />
        </label>
        <label className="block text-sm font-semibold">
          {c.form.yacht}
          <select
            className={field}
            name="yacht_slug"
            value={yachtId}
            onChange={(e) => setYachtId(e.target.value)}
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
            value={mapHubs.find((m) => m.id === originId)?.name || ""}
            onChange={(e) => {
              const hub = mapHubs.find((m) => m.name === e.target.value);
              if (hub) setOriginId(hub.id);
            }}
          >
            {mapHubs.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name} — {m.city}, {placeCountry(m, locale)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          {c.form.destination}
          <select
            className={field}
            name="destination"
            value={mapHubs.find((m) => m.id === destinationId)?.name || ""}
            onChange={(e) => {
              const hub = mapHubs.find((m) => m.name === e.target.value);
              if (hub) setDestinationId(hub.id);
            }}
          >
            {mapHubs.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name} — {m.city}, {placeCountry(m, locale)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          {c.form.date}
          <input
            className={field}
            type="date"
            name="trip_date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
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
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            required
          />
        </label>
        <label className="block text-sm font-semibold md:col-span-2">
          {c.form.notes}
          <textarea className={field} name="notes" rows={3} />
        </label>
      </div>
      {quote ? (
        <p className="mt-5 text-sm font-semibold text-kaenz-deep">
          {c.from} {formatUsd(quote.total)} · {c.pricingTitle}
        </p>
      ) : null}
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
