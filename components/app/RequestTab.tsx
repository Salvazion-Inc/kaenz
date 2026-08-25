"use client";

import { useRouter } from "next/navigation";
import { at } from "@/lib/app-copy";
import { pathFor, type Locale } from "@/lib/locale";
import { placeCountry, places } from "@/lib/places";
import { formatUsd, yachts } from "@/lib/yachts";
import { useTrip, type TripKind } from "@/lib/trip-store";

const field =
  "mt-1.5 w-full rounded-xl border border-navy/10 bg-white px-3 py-2.5 text-sm text-navy outline-none";

export function RequestTab({ locale }: { locale: Locale }) {
  const c = at(locale);
  const { trip, setTrip, fare, yacht } = useTrip();
  const router = useRouter();
  const kinds: TripKind[] = ["commute", "tour", "special"];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTrip({ status: "draft" });
    router.push(pathFor(locale, "/app/trip"));
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold">{c.tabs.request}</h1>
      <p className="mt-1 text-sm text-white/70">{c.requestLead}</p>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {kinds.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTrip({ kind: k })}
            className={`rounded-2xl border p-4 text-left ${
              trip.kind === k
                ? "border-kaenz bg-kaenz/15"
                : "border-white/10 bg-white/5"
            }`}
          >
            <p className="font-bold">{c.kindsTrip[k].title}</p>
            <p className="mt-1 text-xs text-white/70">{c.kindsTrip[k].body}</p>
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-xs font-bold uppercase tracking-wide text-white/60">
          {c.pickup}
          <select
            className={field}
            value={trip.originId}
            onChange={(e) => setTrip({ originId: e.target.value })}
          >
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.city}, {placeCountry(p, locale)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-bold uppercase tracking-wide text-white/60">
          {c.dropoff}
          <select
            className={field}
            value={trip.destinationId}
            onChange={(e) => setTrip({ destinationId: e.target.value })}
          >
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.city}, {placeCountry(p, locale)}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-bold uppercase tracking-wide text-white/60">
            {c.when}
            <input
              className={field}
              type="date"
              required
              value={trip.date}
              onChange={(e) => setTrip({ date: e.target.value })}
            />
          </label>
          <label className="block text-xs font-bold uppercase tracking-wide text-white/60">
            {c.time}
            <input
              className={field}
              type="time"
              required
              value={trip.time}
              onChange={(e) => setTrip({ time: e.target.value })}
            />
          </label>
        </div>
        <label className="block text-xs font-bold uppercase tracking-wide text-white/60">
          {c.who}
          <input
            className={field}
            type="number"
            min={1}
            max={yacht?.guests ?? 13}
            required
            value={trip.guests}
            onChange={(e) => setTrip({ guests: Number(e.target.value) })}
          />
        </label>
        <label className="block text-xs font-bold uppercase tracking-wide text-white/60">
          {c.yacht}
          <select
            className={field}
            value={trip.yachtId}
            onChange={(e) => setTrip({ yachtId: e.target.value })}
          >
            {yachts.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name} · {y.captain.name} · {formatUsd(y.priceFrom)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-bold uppercase tracking-wide text-white/60">
          {c.name}
          <input
            className={field}
            required
            value={trip.name}
            onChange={(e) => setTrip({ name: e.target.value })}
          />
        </label>
        <label className="block text-xs font-bold uppercase tracking-wide text-white/60">
          {c.email}
          <input
            className={field}
            type="email"
            required
            value={trip.email}
            onChange={(e) => setTrip({ email: e.target.value })}
          />
        </label>
        <label className="block text-xs font-bold uppercase tracking-wide text-white/60">
          {c.phone}
          <input
            className={field}
            type="tel"
            value={trip.phone}
            onChange={(e) => setTrip({ phone: e.target.value })}
          />
        </label>
        {fare ? (
          <p className="text-sm font-semibold text-kaenz">
            {c.total}: {formatUsd(fare.total)}
          </p>
        ) : null}
        <button
          type="submit"
          className="w-full rounded-xl bg-kaenz py-3 text-sm font-bold text-white"
        >
          {c.continueTrip}
        </button>
      </form>
    </div>
  );
}
