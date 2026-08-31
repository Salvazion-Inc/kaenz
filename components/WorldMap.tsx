"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { t } from "@/lib/copy";
import { at } from "@/lib/app-copy";
import { mapViewFor } from "@/lib/geo";
import type { Locale } from "@/lib/locale";
import { useLocation } from "@/lib/location";
import { formatCoords, placePhoto } from "@/lib/place-photo";
import { mapTiles } from "@/lib/map-tiles";
import { mapHubs, placeCountry, type Place } from "@/lib/places";

const FLORIDA: [number, number] = [26.05, -80.14];
const WORLD: [number, number] = [22, 8];

function tooltipFor(place: Place, locale: Locale) {
  const c = t(locale);
  const kind = place.kind === "port" ? c.legendPort : c.legendMarina;
  return `${kind} · ${place.name} · ${place.city}, ${placeCountry(place, locale)}`;
}

function uniqueHubs(list: Place[]) {
  const seen = new Set<string>();
  return list.filter((p) => {
    if (p.kind !== "marina" && p.kind !== "port") return false;
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

export function WorldMap({
  locale,
  variant = "site",
  hubs,
  onPickup,
  onDropoff,
}: {
  locale: Locale;
  variant?: "site" | "app";
  hubs?: Place[];
  onPickup?: (place: Place) => void;
  onDropoff?: (place: Place) => void;
}) {
  const c = t(locale);
  const a = at(locale);
  const { here, located, locate } = useLocation();
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markersRef = useRef<
    { place: Place; marker: import("leaflet").Marker }[]
  >([]);
  const youRef = useRef<import("leaflet").Marker | null>(null);
  const zoomRef = useRef<import("leaflet").Control.Zoom | null>(null);
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const pins = useMemo(
    () => uniqueHubs(hubs?.length ? hubs : mapHubs),
    [hubs],
  );
  const pinsRef = useRef(pins);
  pinsRef.current = pins;
  const [selected, setSelected] = useState<Place | null>(null);
  const [view, setView] = useState<"world" | "florida" | "you">("world");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let map: import("leaflet").Map | null = null;

    async function mount() {
      const L = await import("leaflet");
      if (cancelled || !host.current) return;
      leafletRef.current = L;

      map = L.map(host.current, {
        zoomControl: false,
        attributionControl: true,
        minZoom: 2,
        maxZoom: 16,
        worldCopyJump: true,
      }).setView(WORLD, 2);
      mapRef.current = map;

      const tiles = mapTiles();
      L.tileLayer(tiles.url, {
        attribution: tiles.attribution,
        subdomains: tiles.subdomains,
        maxZoom: tiles.maxZoom,
      }).addTo(map);

      const zoom = L.control.zoom({
        position: "topleft",
        zoomInTitle: t(locale).mapZoomIn,
        zoomOutTitle: t(locale).mapZoomOut,
      });
      zoom.addTo(map);
      zoomRef.current = zoom;

      setReady(true);
    }

    void mount();
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      markersRef.current = [];
      youRef.current = null;
      zoomRef.current = null;
      setReady(false);
    };
    // Map instance is created once; locale chrome updates in the next effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    for (const { place, marker } of markersRef.current) {
      marker.setTooltipContent(tooltipFor(place, locale));
    }

    if (zoomRef.current) {
      map.removeControl(zoomRef.current);
    }
    const zoom = L.control.zoom({
      position: "topleft",
      zoomInTitle: t(locale).mapZoomIn,
      zoomOutTitle: t(locale).mapZoomOut,
    });
    zoom.addTo(map);
    zoomRef.current = zoom;
  }, [locale]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !ready) return;

    for (const { marker } of markersRef.current) {
      map.removeLayer(marker);
    }

    const placed: { place: Place; marker: import("leaflet").Marker }[] = [];
    for (const place of pinsRef.current) {
      const pin = L.divIcon({
        className: `kaenz-pin ${place.kind === "port" ? "kaenz-pin-port" : "kaenz-pin-marina"}`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      const marker = L.marker([place.lat, place.lng], { icon: pin });
      marker.bindTooltip(tooltipFor(place, localeRef.current), {
        direction: "top",
        offset: [0, -8],
      });
      marker.on("click", () => {
        setSelected(place);
        map.flyTo([place.lat, place.lng], Math.max(map.getZoom(), 14), {
          duration: 0.6,
        });
      });
      marker.addTo(map);
      placed.push({ place, marker });
    }
    markersRef.current = placed;
  }, [ready, pins]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !located) return;

    const pin = L.divIcon({
      className: "kaenz-pin kaenz-pin-you",
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    if (youRef.current) {
      youRef.current.setLatLng([here.lat, here.lng]);
    } else {
      const marker = L.marker([here.lat, here.lng], { icon: pin, zIndexOffset: 800 });
      marker.bindTooltip(here.label, { direction: "top", offset: [0, -8] });
      marker.addTo(map);
      youRef.current = marker;
    }

    if (view !== "world" && view !== "florida") {
      const next = mapViewFor(here.lat, here.lng);
      map.flyTo(next.center, next.zoom, { duration: 0.9 });
    } else if (view === "world") {
      const next = mapViewFor(here.lat, here.lng);
      map.flyTo(next.center, next.zoom, { duration: 0.9 });
      setView("you");
    }
    // Recenter when GPS lands or the map finishes mounting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [located, here.lat, here.lng, here.label, ready]);

  function fly(center: [number, number], zoom: number, next: "world" | "florida" | "you") {
    mapRef.current?.flyTo(center, zoom, { duration: 0.9 });
    setSelected(null);
    setView(next);
  }

  function flyToYou() {
    locate();
    const next = mapViewFor(here.lat, here.lng);
    fly(next.center, next.zoom, "you");
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/70">
          <span className="font-bold text-kaenz">{pins.length}</span>{" "}
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
            onClick={flyToYou}
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              view === "you"
                ? "bg-kaenz text-white"
                : "border border-kaenz/50 text-kaenz"
            }`}
          >
            {c.mapNearMe}
          </button>
          <button
            type="button"
            onClick={() => fly(WORLD, 2, "world")}
            className="rounded-full border border-white/20 px-3 py-1 text-xs font-bold text-white/90 hover:border-kaenz"
          >
            {c.mapWorld}
          </button>
          <button
            type="button"
            onClick={() => fly(FLORIDA, 10, "florida")}
            className="rounded-full border border-white/20 px-3 py-1 text-xs font-bold text-white/90 hover:border-kaenz"
          >
            {c.mapFlorida}
          </button>
        </div>
      </div>
      <div
        className={`overflow-hidden rounded-2xl border border-white/10 ${
          variant === "app" ? "h-80 md:h-[28rem]" : "h-[420px] md:h-[520px]"
        }`}
      >
        <div ref={host} className="h-full w-full" />
      </div>
      {selected ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="relative h-44 bg-navy-2">
            {/* Satellite still of these coordinates, or a real local photo. */}
            <img
              src={placePhoto(selected)}
              alt={selected.name}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-kaenz">
              {selected.kind === "port" ? c.legendPort : c.legendMarina} ·{" "}
              {placeCountry(selected, locale)}
            </p>
            <h3 className="mt-1 text-lg font-bold">{selected.name}</h3>
            <p className="text-sm text-white/70">
              {selected.city}, {placeCountry(selected, locale)}
            </p>
            <p className="mt-1 font-mono text-[11px] text-white/45">
              {formatCoords(selected.lat, selected.lng)}
            </p>
            {selected.address ? (
              <p className="mt-1 text-xs text-white/55">{selected.address}</p>
            ) : null}
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
        </div>
      ) : null}
    </div>
  );
}
