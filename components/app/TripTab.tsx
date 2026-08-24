"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { at } from "@/lib/app-copy";
import { pathFor, type Locale } from "@/lib/locale";
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
  const [wallet, setWallet] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!ready) return null;

  const complete =
    trip.name && trip.email && trip.date && trip.time && yacht && fare;

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!yacht || !fare) return;
    if (trip.payMethod === "card") {
      const digits = card.replace(/\s/g, "");
      if (digits.length < 13 || digits.length > 19) {
        setError(
          locale === "es"
            ? "Revisa el número de tarjeta."
            : "Check the card number.",
        );
        return;
      }
      if (!/^\d{2}\/\d{2}$/.test(exp)) {
        setError(locale === "es" ? "Usa MM/AA." : "Use MM/YY.");
        return;
      }
      if (!/^\d{3,4}$/.test(cvc)) {
        setError(locale === "es" ? "CVC inválido." : "Invalid CVC.");
        return;
      }
    } else if (wallet.trim().length < 32) {
      setError(
        locale === "es"
          ? "Billetera Solana incompleta."
          : "Solana wallet looks incomplete.",
      );
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
          notes: `${trip.kind}; ${trip.payMethod}; ${formatUsd(fare.total)}`,
          locale,
          status: "confirmed",
          amount: fare.total,
          payment_method: trip.payMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setTrip({ status: "confirmed", bookingId: data.id });
    } catch {
      setError(
        locale === "es"
          ? "No se pudo confirmar. Inténtalo de nuevo."
          : "Could not confirm. Try again.",
      );
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
          <Image src={yacht.image} alt={yacht.name} fill className="object-cover" />
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
            {trip.date} · {trip.time} · {trip.guests} {c.guests}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Image
              src={yacht.captain.photo}
              alt={yacht.captain.name}
              width={44}
              height={44}
              className="h-11 w-11 rounded-full object-cover"
            />
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
            <dd>{formatUsd(fare.captain)}</dd>
          </div>
          <div className="flex justify-between text-navy/60">
            <dt>{c.platformShare}</dt>
            <dd>{formatUsd(fare.platform)}</dd>
          </div>
          <div className="flex justify-between border-t border-navy/10 pt-2 text-base font-bold">
            <dt>{c.total}</dt>
            <dd>{formatUsd(fare.total)}</dd>
          </div>
        </dl>
      </section>

      {trip.status !== "confirmed" ? (
        <form onSubmit={pay} className="mt-4 rounded-2xl border border-white/10 p-4">
          <h3 className="font-bold">{c.pay}</h3>
          <p className="mt-1 text-xs text-white/50">{c.demoPay}</p>
          <div className="mt-3 flex gap-2">
            {(["card", "solana"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setTrip({ payMethod: m })}
                className={`flex-1 rounded-xl py-2 text-sm font-bold ${
                  trip.payMethod === m ? "bg-kaenz text-white" : "bg-white/10"
                }`}
              >
                {m === "card" ? c.card : c.solana}
              </button>
            ))}
          </div>
          {trip.payMethod === "card" ? (
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
          ) : (
            <label className="mt-3 block text-xs font-bold">
              {c.wallet}
              <input
                className={field}
                placeholder="So11ana…"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
              />
            </label>
          )}
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
