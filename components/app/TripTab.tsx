"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { at } from "@/lib/app-copy";
import { pathFor, type Locale } from "@/lib/locale";
import { GRATUITY_PCTS, gratuityAmount } from "@/lib/pricing";
import { formatUsd } from "@/lib/yachts";
import { useTrip } from "@/lib/trip-store";

const field =
  "mt-1.5 w-full rounded-xl border border-navy/10 bg-white px-3 py-2.5 text-sm text-navy outline-none";

export function TripTab({ locale }: { locale: Locale }) {
  const c = at(locale);
  const { trip, setTrip, yacht, fare, originName, destinationName, ready } =
    useTrip();
  const [card, setCard] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!ready) return null;

  const complete =
    trip.name && trip.email && trip.date && trip.time && yacht && fare;

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!yacht || !fare) return;
    const digits = card.replace(/\s/g, "");
    if (digits.length < 13 || digits.length > 19) {
      setError(c.errCard);
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(exp)) {
      setError(c.errExp);
      return;
    }
    if (!/^\d{3,4}$/.test(cvc)) {
      setError(c.errCvc);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: trip.name,
          email: trip.email,
          phone: trip.phone,
          yacht_slug: trip.yachtId,
          origin: originName,
          destination: destinationName,
          trip_date: trip.date,
          trip_time: trip.time,
          guests: trip.guests,
          notes: `${trip.kind}; stripe; ${trip.hours}h; ${trip.guests} guests; ${formatUsd(fare.total)}; gratuity ${trip.gratuityPct || 0}%; marina ${formatUsd(fare.marina.total)}`,
          locale,
          status: "confirmed",
          amount: fare.total + gratuityAmount(fare.total, trip.gratuityPct || 0),
          payment_method: "stripe",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setTrip({ status: "confirmed", bookingId: data.id });
    } catch {
      setError(c.errConfirm);
    } finally {
      setBusy(false);
    }
  }

  if (!complete) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <h1 className="text-2xl font-extrabold">{c.tabs.trip}</h1>
        <p className="mt-3 text-sm text-white/70">{c.noTrip}</p>
        <Link
          href={pathFor(locale, "/app/request")}
          className="mt-6 inline-block rounded-xl bg-kaenz px-6 py-3 text-sm font-bold"
        >
          {c.requestCta}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold">{c.tabs.trip}</h1>
      <p className="mt-1 text-sm text-white/70">{c.tripLead}</p>

      {trip.status === "confirmed" ? (
        <div className="mt-5 rounded-2xl border border-kaenz/40 bg-kaenz/10 p-5">
          <p className="text-sm font-bold text-kaenz">{c.confirmed}</p>
          <p className="mt-2 text-sm text-white/80">
            {c.statusConfirmed} · {yacht.captain.name}
          </p>
          {trip.bookingId ? (
            <p className="mt-1 font-mono text-xs text-white/50">
              {trip.bookingId}
            </p>
          ) : null}
        </div>
      ) : null}

      <section className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <div className="relative h-36">
          {yacht.image.startsWith("http") ? (
            <img src={yacht.image} alt={yacht.name} className="h-36 w-full object-cover" />
          ) : (
            <Image src={yacht.image} alt={yacht.name} fill className="object-cover" />
          )}
        </div>
        <div className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-kaenz">
            {c.kindsTrip[trip.kind].title}
          </p>
          <h2 className="text-xl font-bold">{yacht.name}</h2>
          <p className="mt-3 text-sm">
            <span className="text-white/50">{c.route}</span>
            <br />
            {originName} → {destinationName}
          </p>
          <p className="mt-2 text-sm text-white/70">
            {trip.date} · {trip.time} · {trip.hours} {c.hoursUnit} · {trip.guests}{" "}
            {c.guests}
          </p>
          <div className="mt-4 flex items-center gap-3">
            {yacht.captain.photo.startsWith("http") ? (
              <img
                src={yacht.captain.photo}
                alt={yacht.captain.name}
                className="h-11 w-11 rounded-full object-cover"
              />
            ) : (
              <Image
                src={yacht.captain.photo}
                alt={yacht.captain.name}
                width={44}
                height={44}
                className="h-11 w-11 rounded-full object-cover"
              />
            )}
            <div>
              <p className="text-xs text-white/50">{c.captain}</p>
              <p className="text-sm font-semibold">{yacht.captain.name}</p>
              <p className="text-xs text-kaenz">{yacht.captain.license}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-2xl bg-white p-4 text-navy">
        <h3 className="font-bold">{c.fare}</h3>
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt>{c.boat}</dt>
            <dd>{formatUsd(fare.total)}</dd>
          </div>
          <div className="flex justify-between text-navy/60">
            <dt>{c.ownerShare}</dt>
            <dd>{formatUsd(fare.owner)}</dd>
          </div>
          <div className="flex justify-between text-navy/60">
            <dt>{c.captainShare}</dt>
            <dd>
              {formatUsd(
                fare.captain + gratuityAmount(fare.total, trip.gratuityPct || 0),
              )}
            </dd>
          </div>
          {fare.marina.roundTrip && fare.marina.total ? (
            <div className="flex justify-between text-navy/60">
              <dt>{c.marinaRoundShare}</dt>
              <dd>{formatUsd(fare.marina.total)}</dd>
            </div>
          ) : (
            <>
              {fare.marina.origin ? (
                <div className="flex justify-between text-navy/60">
                  <dt>{c.marinaPickupShare}</dt>
                  <dd>{formatUsd(fare.marina.origin)}</dd>
                </div>
              ) : null}
              {fare.marina.destination ? (
                <div className="flex justify-between text-navy/60">
                  <dt>{c.marinaDropoffShare}</dt>
                  <dd>{formatUsd(fare.marina.destination)}</dd>
                </div>
              ) : null}
            </>
          )}
          <div className="flex justify-between text-navy/60">
            <dt>{c.platformShare}</dt>
            <dd>{formatUsd(fare.platform)}</dd>
          </div>
          {trip.gratuityPct ? (
            <div className="flex justify-between text-navy/60">
              <dt>{c.gratuity}</dt>
              <dd>{formatUsd(gratuityAmount(fare.total, trip.gratuityPct))}</dd>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-navy/10 pt-2 text-base font-bold">
            <dt>{c.total}</dt>
            <dd>
              {formatUsd(
                fare.total + gratuityAmount(fare.total, trip.gratuityPct || 0),
              )}
            </dd>
          </div>
        </dl>
      </section>

      {trip.status !== "confirmed" ? (
        <form onSubmit={pay} className="mt-4 rounded-2xl border border-white/10 p-4">
          <h3 className="font-bold">{c.pay}</h3>
          <p className="mt-1 text-xs text-white/50">{c.demoPay}</p>
          <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-white/60">
            {c.gratuity}
            <select
              className={field}
              value={trip.gratuityPct || 0}
              onChange={(e) => setTrip({ gratuityPct: Number(e.target.value) })}
            >
              {GRATUITY_PCTS.map((pct) => (
                <option key={pct} value={pct}>
                  {pct === 0 ? c.gratuityNone : `${pct}%`}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-1 text-[11px] text-white/45">{c.gratuityHint}</p>
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-kaenz">
            {c.stripePay}
          </p>
          <div className="mt-3 space-y-3">
            <label className="block text-xs font-bold">
              {c.cardNumber}
              <input
                className={field}
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="4242 4242 4242 4242"
                value={card}
                onChange={(e) => setCard(e.target.value)}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-bold">
                {c.expiry}
                <input
                  className={field}
                  placeholder="12/28"
                  value={exp}
                  onChange={(e) => setExp(e.target.value)}
                />
              </label>
              <label className="block text-xs font-bold">
                {c.cvc}
                <input
                  className={field}
                  inputMode="numeric"
                  placeholder="123"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                />
              </label>
            </div>
          </div>
          {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="mt-4 w-full rounded-xl bg-kaenz py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {busy ? c.paying : c.payConfirm}
          </button>
        </form>
      ) : (
        <p className="mt-4 text-center text-sm text-white/70">{c.statusUnderway}</p>
      )}
    </div>
  );
}
