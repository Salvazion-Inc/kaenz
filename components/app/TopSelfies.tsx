"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { at } from "@/lib/app-copy";
import type { Locale } from "@/lib/locale";
import {
  SELFIE_CIRCLES,
  TOPQ1_DRIVE,
  TOP_SELFIES_YEAR,
  topQ1Selfies,
  type SelfieCircle,
  type TripSelfie,
} from "@/lib/selfies";
import { useSelfies, vibesOf } from "@/lib/selfie-store";
import { IconVibes } from "./icons";

const PREVIEW = 12;

function formatVibes(locale: Locale, n: number) {
  return new Intl.NumberFormat(locale).format(n);
}

export function TopSelfies({ locale }: { locale: Locale }) {
  const s = at(locale).selfies;
  const { given, giveVibe, hasVibed } = useSelfies();
  const [circle, setCircle] = useState<SelfieCircle | "all">("all");
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allRanked = useMemo(
    () =>
      topQ1Selfies
        .map((item) => ({ ...item, vibes: vibesOf(item, given) }))
        .sort((a, b) => b.vibes - a.vibes || a.name.localeCompare(b.name)),
    [given],
  );
  const ranked =
    circle === "all" ? allRanked : allRanked.filter((item) => item.circle === circle);

  const visible = open ? ranked : ranked.slice(0, PREVIEW);
  const podium = ranked.slice(0, 3);
  const selected = selectedId
    ? allRanked.find((item) => item.id === selectedId) || null
    : null;

  useEffect(() => {
    if (!selectedId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-kaenz">
            {TOPQ1_DRIVE}
          </p>
          <h2 className="mt-1 text-xl font-extrabold">
            {s.topTitle.replace("{year}", String(TOP_SELFIES_YEAR))}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-white/70">{s.topLead}</p>
        </div>
        <p className="text-xs font-semibold text-white/50">
          {ranked.length} · {s.vibes}
        </p>
      </div>

      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
        <FilterChip
          active={circle === "all"}
          onClick={() => setCircle("all")}
          label={s.allCircles}
        />
        {SELFIE_CIRCLES.map((id) => (
          <FilterChip
            key={id}
            active={circle === id}
            onClick={() => setCircle(id)}
            label={s.circles[id]}
          />
        ))}
      </div>

      {circle === "all" && podium.length === 3 ? (
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          {podium.map((item, i) => (
            <SelfieCard
              key={item.id}
              selfie={item}
              rank={i + 1}
              locale={locale}
              featured={i === 0}
              given={hasVibed(item.id)}
              onVibe={() => giveVibe(item.id)}
              onOpen={() => setSelectedId(item.id)}
              className={i === 0 ? "col-span-2 md:col-span-1 md:row-span-1" : ""}
            />
          ))}
        </div>
      ) : null}

      <ul
        className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 ${
          circle === "all" ? "mt-3" : "mt-5"
        }`}
      >
        {visible
          .filter((item) => !(circle === "all" && podium.some((p) => p.id === item.id)))
          .map((item) => {
            const rank = ranked.findIndex((row) => row.id === item.id) + 1;
            return (
              <li key={item.id}>
                <SelfieCard
                  selfie={item}
                  rank={rank}
                  locale={locale}
                  given={hasVibed(item.id)}
                  onVibe={() => giveVibe(item.id)}
                  onOpen={() => setSelectedId(item.id)}
                />
              </li>
            );
          })}
      </ul>

      {ranked.length > PREVIEW ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-4 w-full rounded-xl border border-white/15 py-3 text-sm font-bold text-white/80"
        >
          {open ? s.showLess : s.showAll}
        </button>
      ) : null}

      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-navy/80 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setSelectedId(null)}
          role="presentation"
        >
          <article
            className="max-h-[90dvh] w-full max-w-md overflow-auto rounded-2xl border border-white/15 bg-navy-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              {selected.photo.startsWith("data:") ? (
                <img
                  src={selected.photo}
                  alt={selected.name}
                  className="max-h-[55dvh] w-full object-cover"
                />
              ) : (
                <Image
                  src={selected.photo}
                  alt={selected.name}
                  width={720}
                  height={960}
                  className="max-h-[55dvh] w-full object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="absolute right-3 top-3 rounded-full bg-navy/80 px-2.5 py-1 text-sm font-bold"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-kaenz">
                #{allRanked.findIndex((row) => row.id === selected.id) + 1} ·{" "}
                {s.circles[selected.circle]}
              </p>
              <h3 className="mt-1 text-lg font-extrabold">{selected.name}</h3>
              <p className="text-sm text-white/65">
                {selected.place} · {selected.city}
              </p>
              {selected.caption ? (
                <p className="mt-2 text-sm text-white/80">{selected.caption}</p>
              ) : null}
              <button
                type="button"
                onClick={() => giveVibe(selected.id)}
                className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold ${
                  hasVibed(selected.id)
                    ? "bg-white/15 text-kaenz"
                    : "bg-kaenz text-white"
                }`}
              >
                <IconVibes className="h-5 w-5" />
                {hasVibed(selected.id) ? s.vibed : s.giveVibes}
                <span className="opacity-80">
                  · {formatVibes(locale, selected.vibes)}
                </span>
              </button>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold ${
        active ? "bg-kaenz text-white" : "bg-white/10 text-white/70"
      }`}
    >
      {label}
    </button>
  );
}

function SelfieCard({
  selfie,
  rank,
  locale,
  given,
  onVibe,
  onOpen,
  featured,
  className = "",
}: {
  selfie: TripSelfie;
  rank: number;
  locale: Locale;
  given: boolean;
  onVibe: () => void;
  onOpen: () => void;
  featured?: boolean;
  className?: string;
}) {
  const s = at(locale).selfies;
  const medal =
    rank === 1 ? "bg-amber-400 text-navy" : rank === 2 ? "bg-white text-navy" : rank === 3 ? "bg-orange-400 text-navy" : "bg-navy/80 text-white";

  return (
    <article
      className={`overflow-hidden rounded-2xl border border-white/10 bg-white/5 ${className}`}
    >
      <button type="button" onClick={onOpen} className="relative block w-full">
        {selfie.photo.startsWith("data:") ? (
          <img
            src={selfie.photo}
            alt={selfie.name}
            className={`w-full object-cover ${featured ? "aspect-[4/5] sm:aspect-[3/4]" : "aspect-[3/4]"}`}
          />
        ) : (
          <Image
            src={selfie.photo}
            alt={selfie.name}
            width={featured ? 720 : 480}
            height={featured ? 960 : 640}
            className={`w-full object-cover ${featured ? "aspect-[4/5] sm:aspect-[3/4]" : "aspect-[3/4]"}`}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        )}
        <span
          className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${medal}`}
        >
          #{rank}
        </span>
        <span className="absolute bottom-2 left-2 rounded-full bg-navy/75 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
          {s.circles[selfie.circle]}
        </span>
      </button>
      <div className="p-2.5">
        <p className="truncate text-sm font-bold">{selfie.name}</p>
        <p className="truncate text-[11px] text-white/55">{selfie.place}</p>
        <button
          type="button"
          onClick={onVibe}
          className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-bold ${
            given ? "bg-kaenz/20 text-kaenz" : "bg-white/10 text-white"
          }`}
        >
          <IconVibes className="h-3.5 w-3.5" />
          {given ? s.vibed : s.giveVibes}
          <span className="opacity-70">{formatVibes(locale, selfie.vibes)}</span>
        </button>
      </div>
    </article>
  );
}
