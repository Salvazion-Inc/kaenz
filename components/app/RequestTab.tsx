"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { at } from "@/lib/app-copy";
import { pathFor, type Locale } from "@/lib/locale";
import { useLocation } from "@/lib/location";
import {
  clampHours,
  defaultHoursFor,
  HOURS_RANGE,
  nowStamp,
  type TripKind,
  type WhenMode,
} from "@/lib/pricing";
import { useTripLog } from "@/lib/trip-log";
import { useDispatch } from "@/lib/dispatch-store";
import { useTrip } from "@/lib/trip-store";
import { maskCard } from "@/lib/profile";
import { useProfile } from "@/lib/profile-store";
import { FareCard } from "./FareCard";
import { GratuityPicker } from "./GratuityPicker";
import { PlaceSuggest } from "./PlaceSuggest";

const field =
  "mt-1.5 w-full rounded-xl border border-navy/10 bg-white px-3 py-2.5 text-sm text-navy outline-none";

export function RequestTab({ locale }: { locale: Locale }) {
  const c = at(locale);
  const { trip, setTrip, fare, yacht, fleet, allPlaces, originName, destinationName, originPlace } =
    useTrip();
  const { addTrip } = useTripLog();
  const { postOffer } = useDispatch();
  const { profile, ready: profileReady, complete } = useProfile();
  const { here } = useLocation();
  const router = useRouter();
  const kinds: TripKind[] = ["commute", "tour", "special"];
  const whenModes: WhenMode[] = ["now", "schedule"];
  const hoursRange = HOURS_RANGE[trip.kind];

  useEffect(() => {
    if (trip.whenMode !== "now") return;
    setTrip(nowStamp());
  }, [trip.whenMode, setTrip]);

  function pickKind(kind: TripKind) {
    setTrip({ kind, hours: defaultHoursFor(kind, yacht) });
  }

  function pickWhen(mode: WhenMode) {
    if (mode === "now") {
      setTrip({ whenMode: "now", ...nowStamp() });
      return;
    }
    setTrip({ whenMode: "schedule" });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const stamp =
      trip.whenMode === "now"
        ? nowStamp()
        : { date: trip.date, time: trip.time };
    if (!complete || !profile) {
      setTrip({ status: "draft", ...stamp });
      router.push(pathFor(locale, "/app/account"));
      return;
    }
    const offerId = trip.bookingId || `req-${Date.now()}`;
    const origin = originPlace || here;
    postOffer(
      {
        id: offerId,
        customerName: profile.fullName,
        originId: trip.originId,
        destinationId: trip.destinationId,
        originName,
        destName: destinationName,
        originLat: origin.lat,
        originLng: origin.lng,
        guests: trip.guests,
        kind: trip.kind,
        hours: trip.hours,
        yachtId: trip.yachtId,
      },
      fleet,
    );
    setTrip({
      status: "requested",
      tripProgress: 0,
      rating: 0,
      bookingId: offerId,
      ...stamp,
      name: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      payMethod: "stripe",
    });
    if (yacht) {
      addTrip({
        id: offerId,
        date: stamp.date,
        time: stamp.time,
        kind: trip.kind,
        yachtId: trip.yachtId,
        yachtName: yacht.name,
        yachtImage: yacht.image,
        origin: originName,
        destination: destinationName,
        guests: trip.guests,
        hours: trip.hours,
        status: "requested",
        photos: [],
      });
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold">{c.tabs.trip}</h1>
      <p className="mt-1 text-sm text-white/70">{c.requestLead}</p>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {kinds.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => pickKind(k)}
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

      <div className="mt-4 grid grid-cols-2 gap-3">
        {whenModes.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => pickWhen(mode)}
            className={`rounded-2xl border p-4 text-left ${
              trip.whenMode === mode
                ? "border-kaenz bg-kaenz/15"
                : "border-white/10 bg-white/5"
            }`}
          >
            <p className="font-bold">
              {mode === "now" ? c.whenNow : c.whenSchedule}
            </p>
            <p className="mt-1 text-xs text-white/70">
              {mode === "now" ? c.whenNowLead : c.whenScheduleLead}
            </p>
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <PlaceSuggest
          locale={locale}
          label={c.pickup}
          placeholder={c.searchPickup}
          valueId={trip.originId}
          places={allPlaces}
          here={here}
          onSelect={(id) => setTrip({ originId: id })}
        />
        <PlaceSuggest
          locale={locale}
          label={c.dropoff}
          placeholder={c.searchDropoff}
          valueId={trip.destinationId}
          places={allPlaces}
          here={here}
          onSelect={(id) => setTrip({ destinationId: id })}
        />
        {trip.whenMode === "schedule" ? (
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
        ) : (
          <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">
            {c.leavingNow}
          </p>
        )}
        <label className="block text-xs font-bold uppercase tracking-wide text-white/60">
          {c.duration}
          <input
            className={field}
            type="number"
            min={hoursRange.min}
            max={hoursRange.max}
            step={hoursRange.step}
            required
            value={trip.hours}
            onChange={(e) =>
              setTrip({ hours: clampHours(trip.kind, Number(e.target.value)) })
            }
          />
          <span className="mt-1 block text-[11px] font-semibold normal-case tracking-normal text-white/45">
            {c.durationRange[trip.kind]}
          </span>
        </label>
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
            {fleet.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name} · {c.maxGuests} {y.guests}
                {y.traits?.length
                  ? ` · ${y.traits.map((trait) => c.addYacht[trait]).join(" · ")}`
                  : ""}
              </option>
            ))}
          </select>
        </label>
        {profileReady && complete && profile ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-kaenz">
              {c.account.usingAccount}
            </p>
            <p className="mt-2 text-sm font-semibold">{profile.fullName}</p>
            <p className="text-sm text-white/70">{profile.email}</p>
            {profile.phone ? (
              <p className="text-sm text-white/70">{profile.phone}</p>
            ) : null}
            {profile.creditCard ? (
              <p className="mt-1 text-xs text-white/55">
                {c.account.creditCard}: {maskCard(profile.creditCard)}
              </p>
            ) : null}
            {profile.debitCard ? (
              <p className="text-xs text-white/55">
                {c.account.debitCard}: {maskCard(profile.debitCard)}
              </p>
            ) : null}
            {profile.solanaWallet ? (
              <p className="text-xs text-white/55">
                {c.account.solanaWallet}: {profile.solanaWallet.slice(0, 4)}…
                {profile.solanaWallet.slice(-4)}
              </p>
            ) : null}
            <Link
              href={pathFor(locale, "/app/account")}
              className="mt-2 inline-block text-xs font-semibold text-kaenz"
            >
              {c.account.editAccount}
            </Link>
          </div>
        ) : profileReady ? (
          <div className="rounded-xl border border-kaenz/40 bg-kaenz/10 p-3">
            <p className="text-sm text-white/80">{c.account.incomplete}</p>
            <Link
              href={pathFor(locale, "/app/account")}
              className="mt-2 inline-block rounded-lg bg-kaenz px-3 py-2 text-xs font-bold text-white"
            >
              {c.account.goAccount}
            </Link>
          </div>
        ) : null}
        {fare ? (
          <div className="space-y-3">
            <FareCard
              locale={locale}
              fare={fare}
              gratuityPct={trip.gratuityPct || 0}
              marketName={fare.marketName}
            />
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <GratuityPicker
                locale={locale}
                fare={fare.total}
                value={trip.gratuityPct || 0}
                onChange={(pct) => setTrip({ gratuityPct: pct })}
              />
            </div>
            <p className="text-xs text-white/55">{c.payAfterQuote}</p>
          </div>
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
