"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { WorldMap } from "@/components/WorldMap";
import { at } from "@/lib/app-copy";
import {
  FEATURED_KINDS,
  featuredByKind,
  featuredPlaces,
  featuredSorted,
  type FeaturedKind,
} from "@/lib/featured-places";
import { formatKm, haversineKm } from "@/lib/geo";
import { pathFor, type Locale } from "@/lib/locale";
import { useLocation } from "@/lib/location";
import { placeCountry, type Place } from "@/lib/places";
import { useTrip } from "@/lib/trip-store";
import { AddMarinaForm } from "./AddMarinaForm";

function FeaturedCard({
  p,
  locale,
  km,
  setPickup,
  setDropoff,
  pickupLabel,
  dropoffLabel,
}: {
  p: Place;
  locale: Locale;
  km?: number;
  setPickup: () => void;
  setDropoff: () => void;
  pickupLabel: string;
  dropoffLabel: string;
}) {
  return (
    <li className="w-[16.5rem] shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div className="relative h-36">
        <Image src={p.image} alt={p.name} fill className="object-cover" />
        {km != null && Number.isFinite(km) ? (
          <span className="absolute right-2 top-2 rounded-full bg-navy/80 px-2 py-0.5 text-[10px] font-bold">
            {formatKm(km)}
          </span>
        ) : null}
      </div>
      <div className="p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">
          {p.city}
          {placeCountry(p, locale) !== p.city
            ? ` · ${placeCountry(p, locale)}`
            : ""}
        </p>
        <h4 className="mt-0.5 truncate text-sm font-bold">{p.name}</h4>
        <p className="mt-1 line-clamp-2 text-xs text-white/70">{p.blurb[locale]}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={setPickup}
            className="rounded-lg bg-white/10 py-2 text-[11px] font-bold"
          >
            {pickupLabel}
          </button>
          <button
            type="button"
            onClick={setDropoff}
            className="rounded-lg bg-kaenz py-2 text-[11px] font-bold text-white"
          >
            {dropoffLabel}
          </button>
        </div>
      </div>
    </li>
  );
}

export function PlacesTab({ locale }: { locale: Locale }) {
  const c = at(locale);
  const { setTrip, trip, allPlaces, addPartnerPlace } = useTrip();
  const { here, located, locating, locate } = useLocation();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState("");

  const gps = located ? here : null;
  const nearYou = useMemo(() => featuredSorted(gps), [gps]);
  const hubs = useMemo(
    () => allPlaces.filter((p) => p.kind === "marina" || p.kind === "port"),
    [allPlaces],
  );

  function go(id: string, role: "originId" | "destinationId") {
    if (trip.status === "draft" || trip.status === "rated") {
      setTrip({ [role]: id, status: "draft" });
    }
    router.push(pathFor(locale, "/app/trip"));
  }

  function kmFor(p: Place) {
    return gps ? haversineKm(gps, p) : undefined;
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold">{c.tabs.places}</h1>
      <p className="mt-1 text-sm text-white/70">{c.placesLead}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={locate}
          className="rounded-full border border-kaenz/40 px-4 py-1.5 text-xs font-bold text-kaenz"
        >
          {locating ? c.locating : located ? here.label : c.useLocation}
        </button>
        <button
          type="button"
          onClick={() => setAdding((open) => !open)}
          className="rounded-full bg-kaenz px-4 py-1.5 text-xs font-bold text-white"
        >
          {c.addMarina.cta}
        </button>
      </div>
      {adding ? (
        <AddMarinaForm
          locale={locale}
          onCancel={() => setAdding(false)}
          onListed={(place) => {
            addPartnerPlace(place);
            setAdding(false);
            setNotice(c.addMarina.listed);
          }}
        />
      ) : null}
      {notice ? (
        <p className="mt-3 rounded-xl border border-kaenz/40 bg-kaenz/10 px-3 py-2 text-sm text-kaenz">
          {notice}
        </p>
      ) : null}

      <div className="mt-5">
        <WorldMap
          locale={locale}
          variant="app"
          hubs={hubs}
          onPickup={(p) => go(p.id, "originId")}
          onDropoff={(p) => go(p.id, "destinationId")}
        />
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-extrabold">{c.featuredPlaces}</h2>
        <p className="mt-1 text-xs text-white/55">{c.featuredSwipe}</p>

        <div className="mt-4">
          <h3 className="flex items-baseline justify-between gap-2 text-xs font-bold uppercase tracking-widest text-kaenz">
            <span>{c.featuredNearYou}</span>
            <span className="font-semibold normal-case tracking-normal text-white/45">
              {featuredPlaces.length}
            </span>
          </h3>
          <ul className="featured-rail mt-2 -mx-4 px-4">
            {nearYou.map((p) => (
              <FeaturedCard
                key={p.id}
                p={p}
                locale={locale}
                km={kmFor(p)}
                setPickup={() => go(p.id, "originId")}
                setDropoff={() => go(p.id, "destinationId")}
                pickupLabel={c.setPickup}
                dropoffLabel={c.setDropoff}
              />
            ))}
          </ul>
        </div>

        {FEATURED_KINDS.map((cat: FeaturedKind) => {
          const items = featuredByKind(cat, gps);
          return (
            <div key={cat} className="mt-4">
              <h3 className="flex items-baseline justify-between gap-2 text-xs font-bold uppercase tracking-widest text-kaenz">
                <span>{c.featured[cat]}</span>
                <span className="font-semibold normal-case tracking-normal text-white/45">
                  {items.length}
                </span>
              </h3>
              <ul className="featured-rail mt-2 -mx-4 px-4">
                {items.map((p) => (
                  <FeaturedCard
                    key={p.id}
                    p={p}
                    locale={locale}
                    km={kmFor(p)}
                    setPickup={() => go(p.id, "originId")}
                    setDropoff={() => go(p.id, "destinationId")}
                    pickupLabel={c.setPickup}
                    dropoffLabel={c.setDropoff}
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}
