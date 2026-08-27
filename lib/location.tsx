"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { defaultHere, haversineKm, nearestPlace } from "./geo";
import { places } from "./places";

export type GpsPoint = { lat: number; lng: number; label: string };

type LocationCtx = {
  here: GpsPoint;
  located: boolean;
  locating: boolean;
  denied: boolean;
  locate: () => void;
};

const LocationCtx = createContext<LocationCtx | null>(null);

const KEY = "kaenz-gps-v1";

function readCached(): GpsPoint | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GpsPoint;
    if (Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng)) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [here, setHere] = useState<GpsPoint>(defaultHere);
  const [located, setLocated] = useState(false);
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);

  const apply = useCallback((lat: number, lng: number) => {
    const near = nearestPlace({ lat, lng }, places);
    const next = {
      lat,
      lng,
      label: near ? near.city : "Near you",
    };
    setHere(next);
    setLocated(true);
    setDenied(false);
    try {
      sessionStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setDenied(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        apply(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setDenied(true);
        setLocating(false);
        setLocated(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60_000 },
    );
  }, [apply]);

  useEffect(() => {
    const cached = readCached();
    if (cached) {
      setHere(cached);
      setLocated(true);
    }
    locate();
  }, [locate]);

  const value = useMemo(
    () => ({ here, located, locating, denied, locate }),
    [here, located, locating, denied, locate],
  );

  return (
    <LocationCtx.Provider value={value}>{children}</LocationCtx.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationCtx);
  if (!ctx) throw new Error("useLocation outside LocationProvider");
  return ctx;
}

export function distanceKm(
  here: { lat: number; lng: number },
  point: { lat: number; lng: number },
) {
  return haversineKm(here, point);
}
