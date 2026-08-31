"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { TripKind } from "./pricing";

export type LoggedTrip = {
  id: string;
  date: string;
  time: string;
  kind: TripKind;
  yachtId: string;
  yachtName: string;
  yachtImage: string;
  origin: string;
  destination: string;
  guests: number;
  hours: number;
  status: "requested" | "confirmed" | "approved" | "waiting" | "underway" | "paid" | "rated";
  photos: string[];
};

const KEY = "kaenz-trip-log-v1";
export const MAX_TRIP_PHOTOS = 8;

type Ctx = {
  trips: LoggedTrip[];
  ready: boolean;
  addTrip: (trip: LoggedTrip) => void;
  addPhotos: (tripId: string, photos: string[]) => boolean;
  removePhoto: (tripId: string, photo: string) => void;
};

const TripLogCtx = createContext<Ctx | null>(null);

function readLocal(): LoggedTrip[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { trips?: LoggedTrip[] };
    return Array.isArray(parsed.trips) ? parsed.trips.filter(isTrip) : [];
  } catch {
    return [];
  }
}

function isTrip(value: unknown): value is LoggedTrip {
  if (!value || typeof value !== "object") return false;
  const t = value as LoggedTrip;
  return Boolean(t.id && t.date && t.yachtName);
}

function mergeTrips(local: LoggedTrip[], server: LoggedTrip[]) {
  const map = new Map<string, LoggedTrip>();
  for (const trip of server) map.set(trip.id, { ...trip, photos: [] });
  for (const trip of local) {
    const prev = map.get(trip.id);
    map.set(trip.id, {
      ...prev,
      ...trip,
      photos: trip.photos?.length ? trip.photos : prev?.photos || [],
    });
  }
  return [...map.values()].sort((a, b) =>
    `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`),
  );
}

export async function compressPhoto(file: File, max = 1000, quality = 0.65) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("canvas");
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}

export function TripLogProvider({ children }: { children: React.ReactNode }) {
  const [trips, setTrips] = useState<LoggedTrip[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const local = readLocal();
    setTrips(local);
    fetch("/api/trips")
      .then((res) => res.json())
      .then((data) => {
        const server = Array.isArray(data.trips) ? data.trips.filter(isTrip) : [];
        setTrips(mergeTrips(local, server));
      })
      .catch(() => setTrips(local))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ trips }));
    } catch {
      /* quota */
    }
  }, [trips, ready]);

  const addTrip = useCallback((trip: LoggedTrip) => {
    setTrips((cur) => mergeTrips([{ ...trip, photos: trip.photos || [] }, ...cur], []));
    fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...trip, photos: [] }),
    }).catch(() => {
      /* local log is enough */
    });
  }, []);

  const addPhotos = useCallback((tripId: string, photos: string[]) => {
    let ok = true;
    setTrips((cur) => {
      const next = cur.map((trip) => {
        if (trip.id !== tripId) return trip;
        return {
          ...trip,
          photos: [...trip.photos, ...photos].slice(0, MAX_TRIP_PHOTOS),
        };
      });
      try {
        localStorage.setItem(KEY, JSON.stringify({ trips: next }));
      } catch {
        ok = false;
        return cur;
      }
      return next;
    });
    return ok;
  }, []);

  const removePhoto = useCallback((tripId: string, photo: string) => {
    setTrips((cur) =>
      cur.map((trip) =>
        trip.id === tripId
          ? { ...trip, photos: trip.photos.filter((item) => item !== photo) }
          : trip,
      ),
    );
  }, []);

  const value = useMemo(
    () => ({ trips, ready, addTrip, addPhotos, removePhoto }),
    [trips, ready, addTrip, addPhotos, removePhoto],
  );

  return <TripLogCtx.Provider value={value}>{children}</TripLogCtx.Provider>;
}

export function useTripLog() {
  const ctx = useContext(TripLogCtx);
  if (!ctx) throw new Error("useTripLog outside TripLogProvider");
  return ctx;
}
