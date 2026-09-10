"use client";

import { useMemo, useState } from "react";
import { t } from "@/lib/copy";
import { defaultDestinationId, seedRealPlaces } from "@/lib/bookable-seed";
import type { Locale } from "@/lib/locale";
import { placeById, type Place } from "@/lib/places";
import {
  clampHours,
  defaultHoursFor,
  estimateFare,
  HOURS_RANGE,
  type TripKind,
} from "@/lib/pricing";
import { formatUsd, type Yacht } from "@/lib/yachts";

const KINDS: TripKind[] = ["commute", "tour", "special"];

export function GuestBookForm({
  locale,
  yacht,
  places,
}: {
  locale: Locale;
  yacht: Yacht;
  places: Place[];
}) {
  const c = t(locale);
  const hubs: Place[] =
    places.length > 0
      ? places
      : seedRealPlaces().length
        ? seedRealPlaces()
        : ([placeById(yacht.marinaId)].filter(Boolean) as Place[]);
  const [kind, setKind] = useState<TripKind>("tour");
  const [hours, setHours] = useState(defaultHoursFor("tour", yacht));
  const [guests, setGuests] = useState(Math.min(4, yacht.guests || 4));
  const [date, setDate] = useState("");
  const [originId, setOriginId] = useState(yacht.marinaId);
  const [destinationId, setDestinationId] = useState(
    defaultDestinationId(yacht, "tour"),
  );
  const [status, setStatus] = useState<"idle" | "sending" | "err">("idle");
  const [message, setMessage] = useState("");

  const origin = hubs.find((p) => p.id === originId) || placeById(originId);
  const destination =
    hubs.find((p) => p.id === destinationId) || placeById(destinationId);
  const quote = useMemo(
    () =>
      estimateFare(yacht, kind, {
        hours,
        guests,
        date,
        origin,
        destination,
      }),
    [yacht, kind, hours, guests, date, origin, destination],
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setMessage("");
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/checkout/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guest: true,
          yachtId: yacht.id,
          kind,
          hours,
          guests,
          date,
          time: String(form.get("trip_time") || ""),
          originId,
          destinationId,
          origin: origin?.name || yacht.marina,
          destination: destination?.name || yacht.marina,
          full_name: String(form.get("full_name") || "").trim(),
          email: String(form.get("email") || "").trim(),
          phone: String(form.get("phone") || "").trim(),
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "stripe_unconfigured") {
          throw new Error(c.stripeMissing);
        }
        if (data.error === "profile") {
          throw new Error(c.form.email);
        }
        throw new Error(data.error || c.formError);
      }
      if (!data.url) throw new Error(c.formError);
      window.location.href = data.url;
    } catch (err) {
      setStatus("err");
      setMessage(err instanceof Error ? err.message : c.formError);
    }
  }

  const field =
    "mt-2 w-full rounded-lg border border-white/15 bg-white px-4 py-3 text-navy outline-none focus:border-kaenz";

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <label className="block text-sm font-semibold">
        {c.form.kind}
        <select
          className={field}
          value={kind}
          onChange={(e) => {
            const next = e.target.value as TripKind;
            setKind(next);
            setHours(defaultHoursFor(next, yacht));
            setDestinationId(defaultDestinationId(yacht, next));
          }}
        >
          {KINDS.map((k, i) => (
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
          min={HOURS_RANGE[kind].min}
          max={HOURS_RANGE[kind].max}
          step={HOURS_RANGE[kind].step}
          required
          value={hours}
          onChange={(e) => setHours(clampHours(kind, Number(e.target.value)))}
        />
      </label>
      <label className="block text-sm font-semibold">
        {c.form.origin}
        <select
          className={field}
          value={originId}
          onChange={(e) => setOriginId(e.target.value)}
        >
          {hubs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-semibold">
        {c.form.destination}
        <select
          className={field}
          value={destinationId}
          onChange={(e) => setDestinationId(e.target.value)}
        >
          {hubs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 md:grid-cols-2">
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
      </div>
      <label className="block text-sm font-semibold">
        {c.form.guests}
        <input
          className={field}
          type="number"
          min={1}
          max={yacht.guests || 13}
          required
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
        />
      </label>
      <label className="block text-sm font-semibold">
        {c.form.name}
        <input className={field} name="full_name" autoComplete="name" required />
      </label>
      <label className="block text-sm font-semibold">
        {c.guestEmail}
        <input
          className={field}
          type="email"
          name="email"
          autoComplete="email"
          required
        />
      </label>
      <label className="block text-sm font-semibold">
        {c.form.phone}
        <input className={field} name="phone" type="tel" autoComplete="tel" />
      </label>
      <p className="text-sm font-semibold text-kaenz">
        {c.from} {formatUsd(quote.total)} USD · {kind} · {hours}h
      </p>
      <button
        type="submit"
        disabled={status === "sending"}
        className="btn-kaenz w-full text-sm"
      >
        {status === "sending" ? c.form.sending : c.payStripe}
      </button>
      {message ? <p className="text-sm text-red-400">{message}</p> : null}
    </form>
  );
}
