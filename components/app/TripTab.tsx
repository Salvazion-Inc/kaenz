"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { at } from "@/lib/app-copy";
import { crew } from "@/lib/crew";
import { type Locale } from "@/lib/locale";
import { nowStamp, settleCharge } from "@/lib/pricing";
import { formatUsd } from "@/lib/yachts";
import { useProfile } from "@/lib/profile-store";
import { useDispatch } from "@/lib/dispatch-store";
import { useOperator } from "@/lib/operator-store";
import { useTripLog } from "@/lib/trip-log";
import { TRIP_STEPS, useTrip, type TripStep } from "@/lib/trip-store";
import { CaptainAvatar } from "@/components/CaptainAvatar";
import { CaptainDesk } from "./CaptainDesk";
import { FareCard } from "./FareCard";
import { GratuityPicker } from "./GratuityPicker";
import { RequestTab } from "./RequestTab";
import { TripLiveMap } from "./TripLiveMap";

export function TripTab({ locale }: { locale: Locale }) {
  const c = at(locale);
  const {
    trip,
    setTrip,
    yacht,
    fare,
    originName,
    destinationName,
    originPlace,
    destinationPlace,
    ready,
  } = useTrip();
  const { profile } = useProfile();
  const { addTrip } = useTripLog();
  const { captain, available } = useOperator();
  const { offers, accept } = useDispatch();
  const ops = c.ops;
  const myOffer = offers.find((item) => item.id === trip.bookingId);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setTrip({
      name: profile.fullName,
      email: profile.email,
      phone: profile.phone,
    });
  }, [profile, setTrip]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const checkout = q.get("checkout");
    const sessionId = q.get("session_id") || "";
    if (checkout === "cancel") {
      setNotice(c.stripeCancel);
      setTrip({ paymentStatus: "unpaid" });
      return;
    }
    if (!sessionId.startsWith("cs_")) return;
    let cancelled = false;
    fetch(`/api/checkout?session_id=${encodeURIComponent(sessionId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.paid) return;
        setTrip({
          paymentStatus: "paid",
          payMethod: "stripe",
          bookingId: String(data.bookingId || trip.bookingId || ""),
          stripeSessionId: sessionId,
          stripePaymentIntent: String(data.paymentIntent || ""),
        });
        setNotice(c.paidWithStripe);
      })
      .catch(() => {
        if (!cancelled) setError(c.errConfirm);
      });
    return () => {
      cancelled = true;
    };
  }, [c.errConfirm, c.paidWithStripe, c.stripeCancel, setTrip, trip.bookingId]);

  useEffect(() => {
    if (trip.status !== "requested") return;
    const offer = offers.find((item) => item.id === trip.bookingId);
    if (offer?.status === "accepted") {
      setTrip({ status: "approved", yachtId: offer.yachtId });
      return;
    }
    if (captain && available) return;
    const id = window.setTimeout(() => {
      const current = offers.find((item) => item.id === trip.bookingId);
      if (!current || current.status !== "offered") {
        setTrip({ status: "approved" });
        return;
      }
      const yid = current.ranked[0]?.yachtId || current.yachtId;
      accept(current.id, yid);
      setTrip({ status: "approved", yachtId: yid });
    }, 8000);
    return () => window.clearTimeout(id);
  }, [trip.status, trip.bookingId, offers, captain, available, accept, setTrip]);

  useEffect(() => {
    if (trip.status === "approved") {
      const id = window.setTimeout(
        () => setTrip({ status: "waiting" }),
        3800,
      );
      return () => window.clearTimeout(id);
    }
    if (trip.status === "waiting") {
      const ids = crew.slice(0, Math.max(1, Math.min(trip.guests, 4))).map(
        (member) => member.id,
      );
      const timer = window.setTimeout(
        () =>
          setTrip({
            status: "underway",
            tripProgress: 0,
            onboardCrewIds: ids,
          }),
        4200,
      );
      return () => window.clearTimeout(timer);
    }
  }, [trip.status, trip.guests, setTrip]);

  useEffect(() => {
    const arrivedNow =
      trip.status === "underway" && (trip.tripProgress || 0) >= 1;
    if (arrivedNow && trip.paymentStatus === "paid") {
      setTrip({ status: "paid" });
    }
  }, [trip.status, trip.tripProgress, trip.paymentStatus, setTrip]);

  const onboard = useMemo(() => {
    const ids = trip.onboardCrewIds || [];
    return crew.filter((member) => ids.includes(member.id));
  }, [trip.onboardCrewIds]);

  if (!ready) return null;

  const complete =
    yacht && fare && (trip.whenMode === "now" || (trip.date && trip.time));
  const step =
    trip.status === "draft" ? null : (trip.status as TripStep);
  const arrived = trip.status === "underway" && (trip.tripProgress || 0) >= 1;
  const paid = trip.paymentStatus === "paid" || trip.status === "paid";
  const showPay =
    Boolean(complete) &&
    trip.status !== "draft" &&
    trip.status !== "rated" &&
    !paid;
  const showRate = trip.status === "paid" || (arrived && paid);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!yacht || !fare || !profile) return;
    setBusy(true);
    const when =
      trip.whenMode === "now" ? nowStamp() : { date: trip.date, time: trip.time };
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: profile.fullName,
          email: profile.email,
          phone: profile.phone,
          yachtId: trip.yachtId,
          originId: trip.originId,
          destinationId: trip.destinationId,
          origin: originName,
          destination: destinationName,
          date: when.date,
          time: when.time,
          guests: trip.guests,
          hours: trip.hours,
          kind: trip.kind,
          whenMode: trip.whenMode,
          gratuityPct: trip.gratuityPct || 0,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "stripe_unconfigured") {
          setError(c.stripeMissing);
          return;
        }
        throw new Error(data.error || "Error");
      }
      setTrip({
        paymentStatus: "pending",
        payMethod: "stripe",
        bookingId: String(data.id || trip.bookingId || ""),
        stripeSessionId: String(data.sessionId || ""),
        date: when.date,
        time: when.time,
      });
      addTrip({
        id: String(data.id || trip.bookingId || `pay-${Date.now()}`),
        date: when.date,
        time: when.time,
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
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("checkout");
    } catch {
      setError(c.errConfirm);
    } finally {
      setBusy(false);
    }
  }

  if (trip.status === "draft" || !complete) {
    return (
      <div>
        {profile?.role === "captain" ? <CaptainDesk locale={locale} /> : null}
        <RequestTab locale={locale} />
      </div>
    );
  }

  const currentIdx = step ? TRIP_STEPS.indexOf(step) : -1;

  return (
    <div>
      <h1 className="text-2xl font-extrabold">{c.tabs.trip}</h1>
      <p className="mt-1 text-sm text-white/70">{c.tripLead}</p>
      {profile?.role === "captain" ? <CaptainDesk locale={locale} /> : null}

      {trip.status === "requested" ? (
        <section className="mt-4 rounded-2xl border border-kaenz/30 bg-kaenz/10 p-4">
          <p className="text-sm font-bold text-kaenz">{ops.matching}</p>
          <p className="mt-1 text-xs text-white/65">
            {ops.offeredTo.replace("{n}", String(myOffer?.ranked.length || 0))}
          </p>
          <ul className="mt-3 space-y-1 text-xs text-white/70">
            {(myOffer?.ranked || []).map((row) => (
              <li key={row.yachtId}>
                {row.name} · {row.captain}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {myOffer?.extraPassengers.length ? (
        <p className="mt-3 text-xs text-white/60">
          {myOffer.extraPassengers.map((pax) => `${pax.name} · ${pax.pickup}`).join(" · ")}
        </p>
      ) : null}

      {step ? (
        <section className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-bold text-kaenz">{c.tripSteps[step]}</p>
          <p className="mt-1 text-xs text-white/65">{c.tripStepLead[step]}</p>
          <ol className="mt-4 space-y-2">
            {TRIP_STEPS.map((id, i) => {
              const done = currentIdx > i;
              const active = currentIdx === i;
              return (
                <li key={id} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      done
                        ? "bg-kaenz text-white"
                        : active
                          ? "border border-kaenz bg-kaenz/20 text-kaenz"
                          : "border border-white/20 text-white/35"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span
                    className={`text-sm ${
                      active
                        ? "font-semibold text-white"
                        : done
                          ? "text-white/80"
                          : "text-white/40"
                    }`}
                  >
                    {c.tripSteps[id]}
                  </span>
                </li>
              );
            })}
          </ol>
          {trip.bookingId ? (
            <p className="mt-3 font-mono text-[11px] text-white/40">
              {trip.bookingId}
            </p>
          ) : null}
        </section>
      ) : null}

      {trip.status === "underway" &&
      originPlace &&
      destinationPlace &&
      Number.isFinite(originPlace.lat) &&
      Number.isFinite(destinationPlace.lat) ? (
        <section className="mt-4">
          <TripLiveMap
            locale={locale}
            origin={originPlace}
            destination={destinationPlace}
            progress={trip.tripProgress || 0}
            onProgress={(p) => {
              const prev = trip.tripProgress || 0;
              if (p === 1 || p - prev >= 0.05) setTrip({ tripProgress: p });
            }}
          />
        </section>
      ) : null}

      {(trip.status === "underway" ||
        trip.status === "paid" ||
        trip.status === "rated") &&
      (yacht || onboard.length) ? (
        <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-kaenz">
            {c.onboard}
          </h3>
          <ul className="mt-3 space-y-3">
            <li className="flex items-center gap-3">
              <CaptainAvatar
                src={yacht.captain.photo}
                name={yacht.captain.name}
                size={44}
              />
              <div>
                <p className="text-sm font-semibold">{yacht.captain.name}</p>
                <p className="text-xs text-white/50">{c.captain}</p>
              </div>
            </li>
            {profile ? (
              <li className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-kaenz/20 text-sm font-bold text-kaenz">
                  {(profile.fullName || "?").slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-semibold">{profile.fullName}</p>
                  <p className="text-xs text-white/50">{c.onboardYou}</p>
                </div>
              </li>
            ) : null}
            {onboard.map((member) => (
              <li key={member.id} className="flex items-center gap-3">
                <Image
                  src={member.photo}
                  alt={member.name}
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-semibold">{member.name}</p>
                  <p className="text-xs text-white/50">{member.goingTo}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
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
            {trip.whenMode === "now" ? c.leavingNow : `${trip.date} · ${trip.time}`}
            {` · ${trip.hours} ${c.hoursUnit} · ${trip.guests} ${c.guests}`}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <CaptainAvatar
              src={yacht.captain.photo}
              name={yacht.captain.name}
              size={44}
            />
            <div>
              <p className="text-xs text-white/50">{c.captain}</p>
              <p className="text-sm font-semibold">{yacht.captain.name}</p>
              <p className="text-xs text-kaenz">{yacht.captain.license}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-4">
        <FareCard
          locale={locale}
          fare={fare}
          gratuityPct={trip.gratuityPct || 0}
          marketName={fare.marketName}
          paid={paid}
        />
      </div>

      {showPay ? (
        <form onSubmit={pay} className="mt-4 rounded-2xl border border-white/10 p-4">
          <h3 className="font-bold">{c.pay}</h3>
          <p className="mt-1 text-xs text-white/50">{c.payAfterQuote}</p>
          <p className="mt-1 text-xs text-white/45">{c.demoPay}</p>
          <div className="mt-3">
            <GratuityPicker
              locale={locale}
              fare={fare.total}
              value={trip.gratuityPct || 0}
              onChange={(pct) => setTrip({ gratuityPct: pct })}
            />
          </div>
          {notice ? (
            <p className="mt-3 text-sm text-kaenz">{notice}</p>
          ) : null}
          {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={busy || !profile}
            className="mt-4 w-full rounded-xl bg-kaenz py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {busy
              ? c.payingStripe
              : `${c.stripePay} · ${formatUsd(settleCharge(fare, trip.gratuityPct || 0).total)}`}
          </button>
        </form>
      ) : notice && paid ? (
        <p className="mt-4 text-sm text-kaenz">{notice}</p>
      ) : null}

      {showRate ? (
        <section className="mt-4 rounded-2xl border border-white/10 p-4">
          <h3 className="font-bold">{c.rateTrip}</h3>
          <div className="mt-3 flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setTrip({ status: "rated", rating: n })}
                className="text-3xl leading-none text-kaenz"
                aria-label={`${n} ${c.stars}`}
              >
                {n <= (trip.rating || 0) ? "★" : "☆"}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {trip.status === "rated" ? (
        <div className="mt-4 text-center">
          <p className="text-3xl tracking-wide text-kaenz">
            {"★".repeat(trip.rating || 0)}
            {"☆".repeat(Math.max(0, 5 - (trip.rating || 0)))}
          </p>
          <p className="mt-2 text-sm text-white/70">
            {c.ratedAs} {trip.rating}/5
          </p>
          <button
            type="button"
            onClick={() =>
              setTrip({
                status: "draft",
                paymentStatus: "unpaid",
                tripProgress: 0,
                rating: 0,
                bookingId: undefined,
                stripeSessionId: undefined,
                stripePaymentIntent: undefined,
                onboardCrewIds: [],
              })
            }
            className="mt-6 w-full rounded-xl bg-kaenz py-3 text-sm font-bold text-white"
          >
            {c.requestCta}
          </button>
        </div>
      ) : null}
    </div>
  );
}
