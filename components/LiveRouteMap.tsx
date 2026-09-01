"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import {
  curvePoint,
  easeInOut,
  headingDeg,
  minutesLeft,
  sampleCurve,
  yachtIconHtml,
  type LatLng,
} from "@/lib/live-route";
import { mapTiles } from "@/lib/map-tiles";
import type { Place } from "@/lib/places";
import { t } from "@/lib/copy";
import type { Locale } from "@/lib/locale";

export function LiveRouteMap({
  origin,
  destination,
  locale,
  loop = true,
  progress,
  onProgress,
  className = "",
  overlay = true,
}: {
  origin: Place;
  destination: Place;
  locale: Locale;
  loop?: boolean;
  progress?: number;
  onProgress?: (value: number) => void;
  className?: string;
  overlay?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(Math.min(1, Math.max(0, progress ?? 0)));
  const lastUi = useRef(0);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  const c = t(locale);
  const totalMin = Math.max(
    8,
    origin.minutesByYacht || destination.minutesByYacht || 12,
  );
  const carMin = Math.max(
    totalMin + 8,
    origin.minutesByCar || destination.minutesByCar || 28,
  );

  useEffect(() => {
    let cancelled = false;
    let map: import("leaflet").Map | null = null;
    let raf = 0;
    const from = Math.min(1, Math.max(0, progress ?? 0));
    const duration = loop ? 16000 : Math.max(5000, 28000 * (1 - from));
    const t0 = performance.now();

    async function mount() {
      const L = await import("leaflet");
      if (cancelled || !host.current) return;
      const start: LatLng = { lat: origin.lat, lng: origin.lng };
      const end: LatLng = { lat: destination.lat, lng: destination.lng };
      const path = sampleCurve(start, end);
      const latlngs = path.map((p) => [p.lat, p.lng] as [number, number]);

      map = L.map(host.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
      });
      const tiles = mapTiles();
      L.tileLayer(tiles.url, {
        attribution: tiles.attribution,
        subdomains: tiles.subdomains,
        maxZoom: tiles.maxZoom,
      }).addTo(map);
      L.polyline(latlngs, {
        color: "#00a1d6",
        weight: 3,
        opacity: 0.9,
      }).addTo(map);
      const dock = L.divIcon({
        className: "kaenz-pin kaenz-pin-marina",
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      L.marker([start.lat, start.lng], { icon: dock, interactive: false }).addTo(
        map,
      );
      L.marker([end.lat, end.lng], { icon: dock, interactive: false }).addTo(map);
      const boat = L.divIcon({
        className: "kaenz-yacht-icon",
        html: yachtIconHtml(0),
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const marker = L.marker([start.lat, start.lng], {
        icon: boat,
        interactive: false,
        zIndexOffset: 900,
      }).addTo(map);
      map.fitBounds(L.latLngBounds(latlngs).pad(0.45));

      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      function place(p: number) {
        if (cancelled) return;
        const t = easeInOut(Math.min(1, Math.max(0, p)));
        const here = curvePoint(start, end, t);
        const ahead = curvePoint(start, end, Math.min(1, t + 0.02));
        marker.setLatLng([here.lat, here.lng]);
        const el = marker.getElement()?.querySelector(".kaenz-yacht") as
          | HTMLElement
          | null;
        if (el) el.style.transform = `rotate(${headingDeg(here, ahead)}deg)`;
        onProgressRef.current?.(t);
        const nowUi = performance.now();
        if (nowUi - lastUi.current > 200 || t >= 1) {
          lastUi.current = nowUi;
          setShown(t);
        }
      }

      if (reduce) {
        place(from < 1 ? Math.max(from, 0.45) : 1);
        return;
      }

      function tick(now: number) {
        if (cancelled) return;
        const elapsed = now - t0;
        const t = loop
          ? (elapsed % duration) / duration
          : Math.min(1, from + (elapsed / duration) * (1 - from));
        place(t);
        if (!loop && t >= 1) return;
        raf = requestAnimationFrame(tick);
      }
      place(from);
      raf = requestAnimationFrame(tick);
    }

    void mount();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      map?.remove();
    };
  }, [
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng,
    loop,
    progress,
  ]);

  const left = minutesLeft(totalMin, shown);
  const faster = Math.max(1, carMin - totalMin);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div ref={host} className="h-full w-full" />
      {overlay ? (
        <div className="pointer-events-none absolute left-3 top-3 max-w-[16rem] rounded-2xl border border-white/15 bg-navy/82 px-3 py-2.5 shadow-lg backdrop-blur-md">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-kaenz">
            <span className="kaenz-live-dot" />
            {c.liveBadge} · {c.liveTrip}
          </p>
          <p className="mt-1 text-xs font-semibold text-white">
            {origin.name} → {destination.name}
          </p>
          <p className="mt-0.5 text-[11px] text-white/70">
            {c.liveAway.replace("{n}", String(left))}
          </p>
          <p className="text-[11px] text-white/55">
            {c.liveFaster.replace("{n}", String(faster))}
          </p>
        </div>
      ) : null}
    </div>
  );
}
