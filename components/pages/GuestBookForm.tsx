"use client";

import { useMemo, useRef, useState } from "react";
import { t, tripKindLabel } from "@/lib/copy";
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
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "redirect" | "err"
  >("idle");
  const [message, setMessage] = useState("");
  const inflight = useRef(false);

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

  const busy = status === "sending" || status === "redirect";

  function validate() {
    const range = HOURS_RANGE[kind];
    if (name.trim().length < 2) return c.invalidName;
    if (!EMAIL.test(email.trim())) return c.invalidEmail;
    if (!Number.isFinite(hours) || hours < range.min || hours > range.max) {
      return c.invalidHours;
    }
    if (
      !Number.isFinite(guests) ||
      guests < 1 ||
      guests > (yacht.guests || 13)
    ) {
      return c.invalidGuests;
    }
    return "";
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || inflight.current) return;
    const invalid = validate();
    if (invalid) {
      setStatus("err");
      setMessage(invalid);
      return;
    }
    inflight.current = true;
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
          full_name: name.trim(),
          email: email.trim(),
          phone: String(form.get("phone") || "").trim(),
          locale,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === "stripe_unconfigured") {
          throw new Error(c.stripeMissing);
        }
        if (data.error === "profile") {
          throw new Error(c.invalidEmail);
        }
        if (data.error === "yacht") {
          throw new Error(c.formError);
        }
        if (data.error === "rate") {
          throw new Error(c.formError);
        }
        throw new Error(c.formError);
      }
      if (!data.url || typeof data.url !== "string") {
        throw new Error(c.formError);
      }
      if (!data.url.startsWith("https://checkout.stripe.com/")) {
        throw new Error(c.formError);
      }
      setStatus("redirect");
      window.location.href = data.url;
    } catch (err) {
      inflight.current = false;
      setStatus("err");
      setMessage(err instanceof Error ? err.message : c.formError);
    }
  }

  const field =
    "mt-2 w-full rounded-lg border border-white/15 bg-white px-4 py-3 text-navy outline-none focus:border-kaenz";

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
      <label className="block text-sm font-semibold">
        {c.form.kind}
        <select
          className={field}
          value={kind}
          disabled={busy}
          onChange={(e) => {
            const next = e.target.value as TripKind;
            setKind(next);
            setHours(defaultHoursFor(next, yacht));
            setDestinationId(defaultDestinationId(yacht, next));
          }}
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {tripKindLabel(locale, k)}
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
          disabled={busy}
          value={hours}
          onChange={(e) => setHours(clampHours(kind, Number(e.target.value)))}
        />
      </label>
      <label className="block text-sm font-semibold">
        {c.form.origin}
        <select
          className={field}
          value={originId}
          disabled={busy}
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
          disabled={busy}
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
            disabled={busy}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="block text-sm font-semibold">
          {c.form.time}
          <input
            className={field}
            type="time"
            name="trip_time"
            required
            disabled={busy}
          />
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
          disabled={busy}
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
        />
      </label>
      <label className="block text-sm font-semibold">
        {c.form.name}
        <input
          className={field}
          name="full_name"
          autoComplete="name"
          required
          disabled={busy}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="block text-sm font-semibold">
        {c.guestEmail}
        <input
          className={field}
          type="email"
          name="email"
          autoComplete="email"
          required
          disabled={busy}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="block text-sm font-semibold">
        {c.form.phone}
        <input
          className={field}
          name="phone"
          type="tel"
          autoComplete="tel"
          disabled={busy}
        />
      </label>
      <p className="text-lg font-extrabold text-kaenz">
        {c.from} {formatUsd(quote.total)} · {tripKindLabel(locale, kind)} ·{" "}
        {hours}h
      </p>
      <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
        {c.stripeTrust}
      </p>
      <button
        type="submit"
        disabled={busy}
        className="btn-kaenz btn-book w-full text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "sending" || status === "redirect"
          ? c.stripeRedirect
          : c.payStripe}
      </button>
      {message ? <p className="text-sm text-red-300">{message}</p> : null}
    </form>
  );
}
