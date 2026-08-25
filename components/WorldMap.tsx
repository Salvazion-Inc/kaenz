"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { t } from "@/lib/copy";
import { at } from "@/lib/app-copy";
import type { Locale } from "@/lib/locale";
import { mapHubs, placeCountry, type Place } from "@/lib/places";

const FLORIDA: [number, number] = [26.05, -80.14];
const WORLD: [number, number] = [22, 8];

export function WorldMap({
  locale,
  variant = "site",
  onPickup,
  onDropoff,
}: {
  locale: Locale;
  variant?: "site" | "app";
  onPickup?: (place: Place) => void;
  onDropoff?: (place: Place) => void;
}) {
  const c = t(locale);
  const a = at(locale);
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const [selected, setSelected] = useState<Place | null>(null);

  useEffect(() => {
    let cancelled = false;
    let map: import("leaflet").Map | null = null;

    async function mount() {
      const L = await import("leaflet");
      if (cancelled || !host.current) return;

      map = L.map(host.current, {
        zoomControl: true,
        attributionControl: true,
        minZoom: 2,
        maxZoom: 12,
        worldCopyJump: true,
      }).setView(WORLD, 2);
      mapRef.current = map;

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
        },
      ).addTo(map);

      for (const place of mapHubs) {
        const pin = L.divIcon({
          className: `kaenz-pin ${place.kind === "port" ? "kaenz-pin-port" : "kaenz-pin-marina"}`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        const marker = L.marker([place.lat, place.lng], { icon: pin });
        marker.bindTooltip(
          `${place.name} · ${place.city}`,
          { direction: "top", offset: [0, -8] },
        );
        marker.on("click", () => {
          setSelected(place);
          map?.flyTo([place.lat, place.lng], Math.max(map.getZoom(), 7), {
            duration: 0.6,
          });
        });
        marker.addTo(map);
      }
    }

    void mount();
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  function fly(center: [number, number], zoom: number) {
    mapRef.current?.flyTo(center, zoom, { duration: 0.9 });
    setSelected(null);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/70">
          <span className="font-bold text-kaenz">{mapHubs.length}</span>{" "}
          {c.hubsLabel}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 hidden items-center gap-3 text-[11px] font-semibold text-white/70 sm:flex">
            <span className="inline-flex items-center gap-1.5">
              <i className="kaenz-pin kaenz-pin-marina relative inline-block h-2.5 w-2.5" />
              {c.legendMarina}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="kaenz-pin kaenz-pin-port relative inline-block h-2.5 w-2.5" />
              {c.legendPort}
            </span>
          </span>
          <button
            type="button"
            onClick={() => fly(WORLD, 2)}
            className="rounded-full border border-white/20 px-3 py-1 text-xs font-bold text-white/90 hover:border-kaenz"
          >
            {c.mapWorld}
          </button>
          <button
            type="button"
            onClick={() => fly(FLORIDA, 10)}
            className="rounded-full bg-kaenz px-3 py-1 text-xs font-bold text-white"
          >
            {c.mapFlorida}
          </button>
        </div>
      </div>
      <div
        className={`overflow-hidden rounded-2xl border border-white/10 ${
          variant === "app" ? "h-64 md:h-80" : "h-[420px] md:h-[520px]"
        }`}
      >
        <div ref={host} className="h-full w-full" />
      </div>
      {selected ? (
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-kaenz">
            {selected.kind === "port" ? c.legendPort : c.legendMarina} ·{" "}
            {placeCountry(selected)}
          </p>
          <h3 className="mt-1 text-lg font-bold">{selected.name}</h3>
          <p className="text-sm text-white/70">
            {selected.city}, {placeCountry(selected)}
          </p>
          <p className="mt-2 text-sm text-white/80">{selected.blurb[locale]}</p>
          {variant === "app" && (onPickup || onDropoff) ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {onPickup ? (
                <button
                  type="button"
                  onClick={() => onPickup(selected)}
                  className="rounded-lg bg-white/10 py-2 text-xs font-bold"
                >
                  {a.setPickup}
                </button>
              ) : null}
              {onDropoff ? (
                <button
                  type="button"
                  onClick={() => onDropoff(selected)}
                  className="rounded-lg bg-kaenz py-2 text-xs font-bold text-white"
                >
                  {a.setDropoff}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
