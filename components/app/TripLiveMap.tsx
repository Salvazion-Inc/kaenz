"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { mapTiles } from "@/lib/map-tiles";
import type { Place } from "@/lib/places";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function TripLiveMap({
  origin,
  destination,
  progress,
  onProgress,
}: {
  origin: Place;
  destination: Place;
  progress: number;
  onProgress: (value: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const boatRef = useRef<import("leaflet").Marker | null>(null);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  const startRef = useRef(Math.min(1, Math.max(0, progress)));

  useEffect(() => {
    let cancelled = false;
    let map: import("leaflet").Map | null = null;
    let raf = 0;
    const from = startRef.current;
    const duration = Math.max(4000, 26000 * (1 - from));
    const t0 = performance.now();

    async function mount() {
      const L = await import("leaflet");
      if (cancelled || !host.current) return;
      const start: [number, number] = [origin.lat, origin.lng];
      const end: [number, number] = [destination.lat, destination.lng];
      map = L.map(host.current, {
        zoomControl: false,
        attributionControl: true,
        minZoom: 8,
        maxZoom: 16,
      });
      mapRef.current = map;
      const tiles = mapTiles();
      L.tileLayer(tiles.url, {
        attribution: tiles.attribution,
        subdomains: tiles.subdomains,
        maxZoom: tiles.maxZoom,
      }).addTo(map);
      L.polyline([start, end], {
        color: "#00a1d6",
        weight: 3,
        opacity: 0.85,
      }).addTo(map);
      const dock = L.divIcon({
        className: "",
        html: `<span style="display:block;width:10px;height:10px;border-radius:999px;background:#f4f6fc;border:2px solid #00a1d6"></span>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });
      L.marker(start, { icon: dock, interactive: false }).addTo(map);
      L.marker(end, { icon: dock, interactive: false }).addTo(map);
      const boat = L.divIcon({
        className: "",
        html: `<span style="display:block;width:16px;height:16px;border-radius:999px;background:#00a1d6;border:2px solid #fff;box-shadow:0 0 12px #00a1d6"></span>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      const marker = L.marker(start, { icon: boat, interactive: false }).addTo(
        map,
      );
      boatRef.current = marker;
      map.fitBounds(L.latLngBounds(start, end).pad(0.35));

      function point(p: number): [number, number] {
        const t = Math.min(1, Math.max(0, p));
        return [lerp(start[0], end[0], t), lerp(start[1], end[1], t)];
      }

      function tick(now: number) {
        if (cancelled) return;
        const t = Math.min(1, from + ((now - t0) / duration) * (1 - from));
        marker.setLatLng(point(t));
        onProgressRef.current(t);
        if (t < 1) raf = requestAnimationFrame(tick);
      }
      marker.setLatLng(point(from));
      if (from < 1) raf = requestAnimationFrame(tick);
      else onProgressRef.current(1);
    }

    void mount();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      map?.remove();
      mapRef.current = null;
      boatRef.current = null;
    };
  }, [origin.lat, origin.lng, destination.lat, destination.lng]);

  return (
    <div
      ref={host}
      className="h-64 w-full overflow-hidden rounded-2xl border border-white/10"
    />
  );
}
