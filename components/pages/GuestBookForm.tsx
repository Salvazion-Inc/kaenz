"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import type { BookingContact } from "@/lib/profile";
import { fetchOfferGate, postTripOffer } from "@/lib/offer-client";
import { formatUsd, type Yacht } from "@/lib/yachts";
import {
  tripCheckoutPausedNotice,
  useTripCheckoutEnabled,
} from "@/components/TripCheckoutFlag";

const KINDS: TripKind[] = ["commute", "tour", "special"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function GuestBookForm({
  locale,
  yacht,
  places,
  contact = null,
}: {
  locale: Locale;
  yacht: Yacht;
  places: Place[];
  contact?: BookingContact | null;
}) {
  const c = t(locale);
  const checkoutOpen = useTripCheckoutEnabled();
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
  const [name, setName] = useState(contact?.fullName || "");
  const [email, setEmail] = useState(contact?.email || "");
  const [phone, setPhone] = useState(contact?.phone || "");
  const [status, setStatus] = useState<
    "idle" | "sending" | "redirect" | "err"
  >("idle");
  const [message, setMessage] = useState("");
  const [gateReady, setGateReady] = useState(false);
  const [autoAccept, setAutoAccept] = useState(false);
  const [offerId, setOfferId] = useState("");
  const [acceptedYachtId, setAcceptedYachtId] = useState("");
  const [accepted, setAccepted] = useState(false);
  const inflight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetchOfferGate().then((gate) => {
      if (cancelled) return;
      setAutoAccept(gate.autoAccept);
      setGateReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!offerId || accepted || autoAccept) return;
    let cancelled = false;
    async function poll() {
      const gate = await fetchOfferGate(offerId);
      if (cancelled) return;
      if (gate.autoAccept) setAutoAccept(true);
      if (gate.accepted) {
        setAccepted(true);
        if (gate.yachtId) setAcceptedYachtId(gate.yachtId);
      }
    }
    poll();
    const timer = window.setInterval(poll, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [offerId, accepted, autoAccept]);

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
    let activeOfferId = offerId;
    try {
      if (!autoAccept && !accepted) {
        if (offerId) {
          inflight.current = false;
          setStatus("idle");
          return;
        }
        const created = await postTripOffer({
          yachtId: yacht.id,
          kind,
          hours,
          guests,
          originName: origin?.name || yacht.marina,
          destName: destination?.name || yacht.marina,
        });
        if (!created.ok) {
          if (!created.autoAccept) {
            if (created.status === 401 || created.error === "unverified") {
              throw new Error(c.verifyTitle);
            }
            throw new Error(c.errCaptain);
          }
          setAutoAccept(true);
        } else {
          setOfferId(created.id);
          setStatus("idle");
          setMessage("");
          inflight.current = false;
          return;
        }
      }
      if (!checkoutOpen) {
        inflight.current = false;
        setStatus("idle");
        setMessage(tripCheckoutPausedNotice(locale));
        return;
      }
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yachtId: acceptedYachtId || yacht.id,
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
          phone: phone.trim(),
          locale,
          offerId: activeOfferId || offerId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === "unverified" || res.status === 401) {
          throw new Error(c.verifyTitle);
        }
        if (data.error === "stripe_unconfigured") {
          throw new Error(c.stripeMissing);
        }
        if (data.error === "trip_checkout_paused") {
          throw new Error(tripCheckoutPausedNotice(locale));
        }
        if (data.error === "profile") {
          throw new Error(c.invalidEmail);
        }
        if (data.error === "yacht") {
          throw new Error(c.formError);
        }
        if (data.error === "captain_required" || res.status === 409) {
          throw new Error(c.errCaptain);
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
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </label>
      <p className="text-lg font-extrabold text-kaenz">
        {c.from} {formatUsd(quote.total)} · {tripKindLabel(locale, kind)} ·{" "}
        {hours}h
      </p>
      {checkoutOpen ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
          {c.stripeTrust}
        </p>
      ) : (
        <p className="text-sm text-white/70">{tripCheckoutPausedNotice(locale)}</p>
      )}
      {gateReady && !autoAccept && offerId && !accepted ? (
        <p className="text-sm font-semibold" role="status">
          {c.waitingForCaptain}
        </p>
      ) : gateReady && (autoAccept || accepted) && checkoutOpen ? (
        <button
          type="submit"
          disabled={busy}
          className="btn-kaenz btn-book w-full text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "sending" || status === "redirect"
            ? c.stripeRedirect
            : c.payStripe}
        </button>
      ) : gateReady && !(autoAccept || accepted) ? (
        <button
          type="submit"
          disabled={busy}
          className="btn-kaenz btn-book w-full text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {c.requestTrip}
        </button>
      ) : gateReady ? null : (
        <p className="text-sm font-semibold" role="status">
          {c.waitingForCaptain}
        </p>
      )}
      {message ? <p className="text-sm text-red-300">{message}</p> : null}
    </form>
  );
}
