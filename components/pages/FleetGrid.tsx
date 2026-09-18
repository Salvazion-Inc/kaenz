"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { t, tripKindLabel } from "@/lib/copy";
import { YACHT_TRAITS, traitLabel, type YachtTrait } from "@/lib/listings";
import { pathFor, type Locale } from "@/lib/locale";
import { seedRealYachts } from "@/lib/bookable-seed";
import { formatUsd, yachts, type Yacht } from "@/lib/yachts";

const ALL: Record<Locale, string> = {
  en: "All",
  es: "Todos",
  fr: "Tous",
  it: "Tutti",
  pt: "Todos",
};

type Scope = "bookable" | "catalog" | "all";

export function FleetGrid({ locale }: { locale: Locale }) {
  const c = t(locale);
  const [klass, setKlass] = useState<"all" | YachtTrait>("all");
  const [scope, setScope] = useState<Scope>("bookable");
  const [bookable, setBookable] = useState<Yacht[]>(() => seedRealYachts());
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch("/api/yachts")
      .then((res) => {
        if (!res.ok) throw new Error("yachts");
        return res.json();
      })
      .then((data) => {
        const rows = Array.isArray(data.yachts) ? (data.yachts as Yacht[]) : [];
        const live = rows.filter((y) => y.bookable !== false);
        if (live.length) setBookable(live);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
  }, []);

  const catalog = useMemo(() => {
    const ids = new Set(bookable.map((y) => y.id));
    return yachts.filter((y) => !ids.has(y.id));
  }, [bookable]);

  const list = useMemo(() => {
    const pool =
      scope === "bookable"
        ? bookable
        : scope === "catalog"
          ? catalog
          : [...bookable, ...catalog];
    return pool.filter((y) => klass === "all" || y.traits.includes(klass));
  }, [scope, bookable, catalog, klass]);

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-2">
        {(["bookable", "catalog", "all"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setScope(value)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold ${
              scope === value
                ? "bg-kaenz text-navy"
                : "border border-white/20 text-white/70"
            }`}
          >
            {value === "bookable"
              ? c.bookableNow
              : value === "catalog"
                ? c.catalogLabel
                : ALL[locale]}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setKlass("all")}
          className={`rounded-full px-4 py-1.5 text-xs font-bold ${
            klass === "all"
              ? "bg-kaenz text-navy"
              : "border border-white/20 text-white/70"
          }`}
        >
          {ALL[locale]}
        </button>
        {YACHT_TRAITS.map((trait) => (
          <button
            key={trait}
            type="button"
            onClick={() => setKlass(trait)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold ${
              klass === trait
                ? "bg-kaenz text-navy"
                : "border border-white/20 text-white/70"
            }`}
          >
            {traitLabel(trait, locale)}
          </button>
        ))}
      </div>
      {scope === "catalog" ? (
        <p className="mt-6 text-sm text-white/55">{c.catalogLead}</p>
      ) : null}
      {loadError && scope !== "catalog" ? (
        <p className="mt-6 rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          {c.fleetError}
        </p>
      ) : null}
      {list.length === 0 ? (
        <p className="mt-12 rounded-2xl border border-white/10 bg-white/5 px-5 py-10 text-center text-sm text-white/65">
          {c.fleetEmpty}
        </p>
      ) : (
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {list.map((y) => {
            const bookableCard = y.bookable === true;
            const kinds = (y.kinds || []).map((kind) =>
              tripKindLabel(locale, kind),
            );
            return (
              <article
                key={y.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
              >
                <div className="relative h-64">
                  <Image
                    src={y.image}
                    alt={y.name}
                    fill
                    className="object-cover"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-navy/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
                    {bookableCard ? c.bookableNow : c.catalogLabel}
                  </span>
                </div>
                <div className="p-6">
                  <p className="text-xs uppercase tracking-widest text-kaenz">
                    {y.marina}
                    {y.lengthFt ? ` · ${y.lengthFt} ft` : ""}
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">{y.name}</h2>
                  {bookableCard && kinds.length ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-white/55">
                      {kinds.join(" · ")}
                    </p>
                  ) : null}
                  <p className="mt-2 text-white/75">{y.blurb[locale]}</p>
                  {y.captain?.name ? (
                    <p className="mt-3 text-sm text-white/70">
                      {c.captain}: {y.captain.name}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                    <p className="text-sm text-white/60">
                      {c.form.guests}: {y.guests} · {y.hoursMin}+ {c.hours}
                    </p>
                    {bookableCard && y.priceFromUsd ? (
                      <p className="text-lg font-extrabold text-kaenz">
                        {c.from} {formatUsd(y.priceFromUsd)}
                      </p>
                    ) : null}
                  </div>
                  <div className="mt-6">
                    <Link
                      href={pathFor(locale, `/fleet/${y.id}`)}
                      className={
                        bookableCard
                          ? "btn-kaenz btn-book !px-5 !py-2 text-sm"
                          : "btn-ghost !px-5 !py-2 text-sm"
                      }
                    >
                      {bookableCard ? c.bookStripe : c.bookNow}
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
