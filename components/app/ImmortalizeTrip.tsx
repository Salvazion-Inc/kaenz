"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { at } from "@/lib/app-copy";
import { pathFor, type Locale } from "@/lib/locale";
import { useProfile } from "@/lib/profile-store";
import { SELFIE_CIRCLES, type SelfieCircle } from "@/lib/selfies";
import { useSelfies } from "@/lib/selfie-store";
import { compressPhoto, useTripLog } from "@/lib/trip-log";
import { useTrip } from "@/lib/trip-store";
import { IconCamera, IconVibes } from "./icons";

export function ImmortalizeTrip({ locale }: { locale: Locale }) {
  const c = at(locale);
  const s = c.selfies;
  const { trip, yacht, originName, destinationName } = useTrip();
  const { trips } = useTripLog();
  const { profile } = useProfile();
  const { uploads, earned, immortalize, ready } = useSelfies();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState("");
  const [circle, setCircle] = useState<SelfieCircle>("friends");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  const live = trip.status !== "draft";
  const recent = trips[0];
  const context = useMemo(() => {
    if (live && yacht) {
      return {
        place: destinationName,
        city: destinationName,
        label: `${yacht.name} · ${originName} → ${destinationName}`,
      };
    }
    if (recent) {
      return {
        place: recent.destination,
        city: recent.destination,
        label: `${recent.yachtName} · ${recent.origin} → ${recent.destination}`,
      };
    }
    return null;
  }, [live, yacht, originName, destinationName, recent]);

  async function onFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    setBusy(true);
    setError("");
    setOk(false);
    try {
      setPhoto(await compressPhoto(file));
    } catch {
      setError(s.photoError);
    } finally {
      setBusy(false);
    }
  }

  function publish() {
    if (!photo || !context || !ready) return;
    const saved = immortalize({
      photo,
      circle,
      caption: caption.trim(),
      name: profile?.fullName || c.onboardYou,
      place: context.place,
      city: context.city,
      tripLabel: context.label,
    });
    if (!saved) {
      setError(s.photoError);
      return;
    }
    setPhoto("");
    setCaption("");
    setOk(true);
  }

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-kaenz/35 bg-gradient-to-br from-kaenz/15 via-white/5 to-white/5">
      <div className="flex items-start justify-between gap-3 p-4 pb-0">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-kaenz">
            {s.campaign}
          </p>
          <h2 className="mt-1 text-lg font-extrabold">{s.immortalize}</h2>
          <p className="mt-1 text-sm text-white/70">{s.immortalizeLead}</p>
        </div>
        <div className="shrink-0 rounded-full border border-kaenz/40 bg-navy/60 px-3 py-1.5 text-center">
          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-white/55">
            <IconVibes className="h-3.5 w-3.5 text-kaenz" />
            {s.yourVibes}
          </p>
          <p className="text-lg font-extrabold leading-none text-kaenz">{earned}</p>
        </div>
      </div>

      <div className="p-4">
        {context ? (
          <p className="mb-3 rounded-xl bg-navy/40 px-3 py-2 text-xs text-white/75">
            <span className="font-bold text-kaenz">{s.onThisTrip}: </span>
            {context.label}
          </p>
        ) : (
          <div className="mb-3 rounded-xl border border-white/10 bg-navy/40 px-3 py-3">
            <p className="text-sm text-white/70">{s.needTrip}</p>
            <Link
              href={pathFor(locale, "/app/trip")}
              className="mt-2 inline-block rounded-lg bg-kaenz px-3 py-1.5 text-xs font-bold text-white"
            >
              {s.startTrip}
            </Link>
          </div>
        )}

        {photo ? (
          <div className="relative overflow-hidden rounded-2xl">
            <img
              src={photo}
              alt=""
              className="aspect-[3/4] w-full object-cover sm:aspect-[4/3] sm:max-h-80"
            />
            <button
              type="button"
              onClick={() => {
                setPhoto("");
                fileRef.current?.click();
              }}
              className="absolute bottom-3 right-3 rounded-full bg-navy/80 px-3 py-1.5 text-[11px] font-bold"
            >
              {s.changePhoto}
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={!context || busy}
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-kaenz/45 bg-navy/30 px-4 py-8 text-center disabled:opacity-50"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-kaenz/20 text-kaenz">
              <IconCamera className="h-6 w-6" />
            </span>
            <span className="mt-2 text-sm font-bold">
              {busy ? s.uploading : s.upload}
            </span>
            <span className="mt-1 text-[11px] text-white/55">{s.cameraHint}</span>
            <span className="mt-3 rounded-full bg-kaenz px-3 py-1 text-[11px] font-bold text-white">
              {s.earnVibes}
            </span>
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.currentTarget.value = "";
          }}
        />

        {photo ? (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {SELFIE_CIRCLES.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCircle(id)}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                    circle === id
                      ? "bg-kaenz text-white"
                      : "bg-white/10 text-white/70"
                  }`}
                >
                  {s.circles[id]}
                </button>
              ))}
            </div>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-white/50">
              {s.caption}
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={s.captionPlaceholder}
                maxLength={120}
                className="mt-1.5 w-full rounded-xl bg-white px-3 py-2.5 text-sm text-navy outline-none"
              />
            </label>
            <button
              type="button"
              onClick={publish}
              className="w-full rounded-xl bg-kaenz py-3 text-sm font-bold text-white"
            >
              {s.publishSelfie}
            </button>
          </div>
        ) : null}

        {ok ? (
          <p className="mt-3 rounded-xl bg-kaenz/20 px-3 py-2 text-sm font-semibold text-kaenz">
            {s.earned}
          </p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

        {uploads.length ? (
          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-white/50">
              {s.yourSelfie}
            </p>
            <ul className="mt-2 flex gap-3 overflow-x-auto pb-1">
              {uploads.map((item) => (
                <li
                  key={item.id}
                  className="w-36 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-navy/40"
                >
                  <img
                    src={item.photo}
                    alt=""
                    className="aspect-[3/4] w-full object-cover"
                  />
                  <div className="p-2">
                    <p className="truncate text-[11px] font-bold">
                      {s.circles[item.circle]}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-kaenz">
                      <IconVibes className="h-3 w-3" />
                      {item.vibes} {s.vibes}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
