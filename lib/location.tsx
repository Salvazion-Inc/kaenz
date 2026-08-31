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
  city: string;
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
  const [city, setCity] = useState(defaultHere.label);
  const [located, setLocated] = useState(false);
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);

  const apply = useCallback((lat: number, lng: number) => {
    const near = nearestPlace({ lat, lng }, places);
    const label = near ? near.city : "Near you";
    const next = { lat, lng, label };
    setHere(next);
    setCity(label);
    setLocated(true);
    setDenied(false);
    try {
      sessionStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    fetch(`/api/geo/city?lat=${lat}&lng=${lng}`)
      .then((res) => res.json())
      .then((data) => {
        const resolved = String(data.city || "").trim();
        if (!resolved) return;
        setCity(resolved);
        setHere((cur) => {
          const updated = { ...cur, label: resolved };
          try {
            sessionStorage.setItem(KEY, JSON.stringify(updated));
          } catch {
            /* ignore */
          }
          return updated;
        });
      })
      .catch(() => {
        /* nearest marina city already set */
      });
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
      setCity(cached.label);
      setLocated(true);
    }
    locate();
  }, [locate]);

  const value = useMemo(
    () => ({ here, city, located, locating, denied, locate }),
    [here, city, located, locating, denied, locate],
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
