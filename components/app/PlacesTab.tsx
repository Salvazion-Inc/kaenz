"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { WorldMap } from "@/components/WorldMap";
import { at } from "@/lib/app-copy";
import {
  FEATURED_KINDS,
  featuredByKind,
  type FeaturedKind,
} from "@/lib/featured-places";
import { pathFor, type Locale } from "@/lib/locale";
import { placeCountry, places, type PlaceKind } from "@/lib/places";
import { useTrip } from "@/lib/trip-store";

export function PlacesTab({ locale }: { locale: Locale }) {
  const c = at(locale);
  const { setTrip } = useTrip();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<PlaceKind | "all">("all");

  const list = useMemo(() => {
    return places.filter((p) => {
      if (p.featured) return false;
      const okKind = kind === "all" || p.kind === kind;
      const hay =
        `${p.name} ${p.city} ${placeCountry(p, locale)} ${p.blurb[locale]}`.toLowerCase();
      return okKind && hay.includes(q.toLowerCase());
    });
  }, [q, kind, locale]);

  function go(id: string, role: "originId" | "destinationId") {
    setTrip({ [role]: id });
    router.push(pathFor(locale, "/app/request"));
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold">{c.tabs.places}</h1>
      <p className="mt-1 text-sm text-white/70">{c.placesLead}</p>

      <section className="mt-5">
        <h2 className="text-lg font-extrabold">{c.featuredPlaces}</h2>
        {FEATURED_KINDS.map((cat: FeaturedKind) => (
          <div key={cat} className="mt-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-kaenz">
              {c.featured[cat]}
            </h3>
            <ul className="mt-2 flex gap-3 overflow-x-auto pb-2">
              {featuredByKind(cat).map((p) => (
                <li
                  key={p.id}
                  className="w-[16.5rem] shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                >
                  <div className="relative h-36">
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                      {p.city}
                      {placeCountry(p, locale) !== p.city
                        ? ` · ${placeCountry(p, locale)}`
                        : ""}
                    </p>
                    <h4 className="mt-0.5 truncate text-sm font-bold">{p.name}</h4>
                    <p className="mt-1 line-clamp-2 text-xs text-white/70">
                      {p.blurb[locale]}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => go(p.id, "originId")}
                        className="rounded-lg bg-white/10 py-2 text-[11px] font-bold"
                      >
                        {c.setPickup}
                      </button>
                      <button
                        type="button"
                        onClick={() => go(p.id, "destinationId")}
                        className="rounded-lg bg-kaenz py-2 text-[11px] font-bold text-white"
                      >
                        {c.setDropoff}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={c.searchPlaces}
        className="mt-5 w-full rounded-xl bg-white px-4 py-3 text-sm text-navy outline-none"
      />

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {(["all", "marina", "port", "place"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold ${
              kind === k ? "bg-kaenz text-white" : "bg-white/10 text-white/80"
            }`}
          >
            {c.kinds[k]}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <WorldMap
          locale={locale}
          variant="app"
          onPickup={(p) => go(p.id, "originId")}
          onDropoff={(p) => go(p.id, "destinationId")}
        />
      </div>

      <ul className="mt-5 space-y-4">
        {list.map((p) => (
          <li
            key={p.id}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
          >
            <div className="flex gap-3 p-3">
              <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-xl">
                <Image src={p.image} alt={p.name} fill className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-kaenz">
                  {c.kinds[p.kind]} · {p.city}
                  {placeCountry(p, locale) !== p.city
                    ? ` · ${placeCountry(p, locale)}`
                    : ""}
                </p>
                <h2 className="truncate text-base font-bold">{p.name}</h2>
                <p className="mt-1 line-clamp-2 text-xs text-white/70">
                  {p.blurb[locale]}
                </p>
                <p className="mt-2 text-xs text-white/55">
                  {p.minutesByCar > 0 ? (
                    <>
                      {p.minutesByYacht} min {c.byYacht} · {p.minutesByCar} min{" "}
                      {c.byCar}
                    </>
                  ) : (
                    <>
                      {p.minutesByYacht} min {c.byYacht} · {c.waterOnly}
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 px-3 pb-3">
              <button
                type="button"
                onClick={() => go(p.id, "originId")}
                className="rounded-lg bg-white/10 py-2 text-xs font-bold"
              >
                {c.setPickup}
              </button>
              <button
                type="button"
                onClick={() => go(p.id, "destinationId")}
                className="rounded-lg bg-kaenz py-2 text-xs font-bold text-white"
              >
                {c.setDropoff}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
