"use client";

import { useMemo, useState } from "react";
import { at } from "@/lib/app-copy";
import { localeMeta, type Locale } from "@/lib/locale";
import {
  compressPhoto,
  MAX_TRIP_PHOTOS,
  useTripLog,
  type LoggedTrip,
} from "@/lib/trip-log";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function ymd(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export function TripCalendar({ locale }: { locale: Locale }) {
  const c = at(locale).account;
  const kinds = at(locale).kindsTrip;
  const { trips, ready, addPhotos, removePhoto } = useTripLog();
  const now = new Date();
  const [cursor, setCursor] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const [selected, setSelected] = useState(ymd(now.getFullYear(), now.getMonth(), now.getDate()));
  const [busy, setBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");

  const lang = localeMeta[locale].htmlLang;
  const monthLabel = new Intl.DateTimeFormat(lang, {
    month: "long",
    year: "numeric",
  }).format(new Date(cursor.year, cursor.month, 1));
  const weekdays = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(lang, { weekday: "short" });
    return Array.from({ length: 7 }, (_, i) =>
      fmt.format(new Date(2026, 2, i + 1)),
    );
  }, [lang]);

  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1).getDay();
    const days = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const out: Array<number | null> = Array.from({ length: first }, () => null);
    for (let d = 1; d <= days; d += 1) out.push(d);
    while (out.length % 7) out.push(null);
    return out;
  }, [cursor]);

  const byDate = useMemo(() => {
    const map: Record<string, LoggedTrip[]> = {};
    for (const trip of trips) {
      if (!trip.date) continue;
      (map[trip.date] ||= []).push(trip);
    }
    return map;
  }, [trips]);

  const dayTrips = byDate[selected] || [];
  const today = ymd(now.getFullYear(), now.getMonth(), now.getDate());

  async function onFiles(tripId: string, files: FileList | null) {
    if (!files?.length) return;
    const trip = trips.find((item) => item.id === tripId);
    const room = MAX_TRIP_PHOTOS - (trip?.photos.length || 0);
    if (room <= 0) return;
    setBusy(true);
    setPhotoError("");
    try {
      const picked = [...files].slice(0, room);
      const photos: string[] = [];
      for (const file of picked) {
        if (!file.type.startsWith("image/")) continue;
        photos.push(await compressPhoto(file));
      }
      if (photos.length) {
        const ok = addPhotos(tripId, photos);
        if (!ok) setPhotoError(c.photoError);
      }
    } catch {
      setPhotoError(c.photoError);
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-kaenz">
        {c.trips}
      </h2>
      <p className="mt-1 text-xs text-white/50">{c.tripsLead}</p>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setCursor((cur) =>
              cur.month === 0
                ? { year: cur.year - 1, month: 11 }
                : { year: cur.year, month: cur.month - 1 },
            )
          }
          className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold"
          aria-label={c.prevMonth}
        >
          ‹
        </button>
        <p className="text-sm font-semibold capitalize">{monthLabel}</p>
        <button
          type="button"
          onClick={() =>
            setCursor((cur) =>
              cur.month === 11
                ? { year: cur.year + 1, month: 0 }
                : { year: cur.year, month: cur.month + 1 },
            )
          }
          className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold"
          aria-label={c.nextMonth}
        >
          ›
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wide text-white/45">
        {weekdays.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const date = ymd(cursor.year, cursor.month, day);
          const has = Boolean(byDate[date]?.length);
          const active = selected === date;
          const isToday = date === today;
          return (
            <button
              key={date}
              type="button"
              onClick={() => setSelected(date)}
              className={`relative h-9 rounded-lg text-xs font-semibold ${
                active
                  ? "bg-kaenz text-white"
                  : isToday
                    ? "bg-white/10 text-white"
                    : "text-white/80 hover:bg-white/10"
              }`}
            >
              {day}
              {has ? (
                <span
                  className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                    active ? "bg-white" : "bg-kaenz"
                  }`}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-3">
        {!trips.length ? (
          <p className="text-sm text-white/60">{c.noTrips}</p>
        ) : !dayTrips.length ? (
          <p className="text-sm text-white/60">{c.noTripsDay}</p>
        ) : (
          dayTrips.map((trip) => (
            <article
              key={trip.id}
              className="overflow-hidden rounded-xl border border-white/10 bg-navy/50"
            >
              {trip.yachtImage ? (
                <img
                  src={trip.yachtImage}
                  alt=""
                  className="h-24 w-full object-cover"
                />
              ) : null}
              <div className="p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-kaenz">
                  {kinds[trip.kind as keyof typeof kinds]?.title || trip.kind}
                </p>
                <h3 className="text-sm font-bold">{trip.yachtName}</h3>
                <p className="mt-1 text-xs text-white/65">
                  {trip.origin} → {trip.destination}
                </p>
                <p className="text-xs text-white/50">
                  {trip.time} · {trip.hours}h · {trip.guests}
                </p>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-white/50">
                  {c.photos}
                </p>
                {trip.photos.length ? (
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {trip.photos.map((src) => (
                      <div key={src.slice(0, 48)} className="relative">
                        <img
                          src={src}
                          alt=""
                          className="h-20 w-full rounded-lg object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(trip.id, src)}
                          className="absolute right-1 top-1 rounded-full bg-navy/80 px-1.5 text-[10px] font-bold"
                          aria-label={c.remove}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
                {trip.photos.length < MAX_TRIP_PHOTOS ? (
                  <label className="mt-2 inline-block cursor-pointer rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold text-white/80">
                    {busy ? c.saving : c.addPhotos}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={busy}
                      onChange={(e) => {
                        onFiles(trip.id, e.target.files);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                ) : null}
                <p className="mt-1 text-[10px] text-white/40">{c.photoLimit}</p>
              </div>
            </article>
          ))
        )}
        {photoError ? <p className="text-sm text-red-400">{photoError}</p> : null}
      </div>
    </section>
  );
}
