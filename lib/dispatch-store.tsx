"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { haversineKm } from "./geo";
import type { Yacht } from "./yachts";

const KEY = "kaenz-dispatch-v1";

export type ExtraPax = {
  id: string;
  name: string;
  pickup: string;
};

export type RankedOffer = {
  yachtId: string;
  name: string;
  captain: string;
  km: number;
  guests: number;
  image: string;
};

export type TripOffer = {
  id: string;
  customerName: string;
  originId: string;
  destinationId: string;
  originName: string;
  destName: string;
  originLat: number;
  originLng: number;
  guests: number;
  kind: string;
  hours: number;
  yachtId: string;
  ranked: RankedOffer[];
  status: "offered" | "accepted" | "declined";
  extraPassengers: ExtraPax[];
  createdAt: number;
};

type Ctx = {
  offers: TripOffer[];
  ready: boolean;
  postOffer: (input: Omit<TripOffer, "ranked" | "status" | "extraPassengers" | "createdAt">, fleet: Yacht[]) => TripOffer;
  accept: (id: string, yachtId: string) => TripOffer | null;
  decline: (id: string) => void;
  addPassenger: (id: string, name: string, pickup: string) => boolean;
};

const DispatchCtx = createContext<Ctx | null>(null);

export function rankNearest(origin: { lat: number; lng: number }, fleet: Yacht[], guests: number) {
  return fleet
    .filter(
      (y) =>
        y.guests >= guests &&
        Number.isFinite(y.lat) &&
        Number.isFinite(y.lng),
    )
    .map((y) => ({
      yachtId: y.id,
      name: y.name,
      captain: y.captain.name,
      km: haversineKm(origin, y),
      guests: y.guests,
      image: y.image,
    }))
    .sort((a, b) => a.km - b.km)
    .slice(0, 5);
}

function readOffers(): TripOffer[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TripOffer[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function DispatchProvider({ children }: { children: React.ReactNode }) {
  const [offers, setOffers] = useState<TripOffer[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setOffers(readOffers());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(offers.slice(0, 30)));
    } catch {
      /* quota */
    }
  }, [offers, ready]);

  const postOffer = useCallback<Ctx["postOffer"]>((input, fleet) => {
    const origin = { lat: input.originLat, lng: input.originLng };
    const ranked = rankNearest(origin, fleet, input.guests);
    const next: TripOffer = {
      ...input,
      ranked,
      yachtId: ranked[0]?.yachtId || input.yachtId,
      status: "offered",
      extraPassengers: [],
      createdAt: Date.now(),
    };
    setOffers((cur) => [next, ...cur.filter((o) => o.id !== next.id)]);
    return next;
  }, []);

  const accept = useCallback((id: string, yachtId: string) => {
    let found: TripOffer | null = null;
    setOffers((cur) =>
      cur.map((o) => {
        if (o.id !== id || o.status !== "offered") return o;
        found = { ...o, status: "accepted", yachtId: yachtId || o.yachtId };
        return found;
      }),
    );
    return found;
  }, []);

  const decline = useCallback((id: string) => {
    setOffers((cur) =>
      cur.map((o) => (o.id === id && o.status === "offered" ? { ...o, status: "declined" } : o)),
    );
  }, []);

  const addPassenger = useCallback((id: string, name: string, pickup: string) => {
    const label = name.trim();
    const stop = pickup.trim();
    if (!label || !stop) return false;
    let ok = false;
    setOffers((cur) =>
      cur.map((o) => {
        if (o.id !== id || o.status !== "accepted") return o;
        const seats = (o.ranked.find((r) => r.yachtId === o.yachtId)?.guests || o.guests) - o.guests - o.extraPassengers.length;
        if (seats <= 0) return o;
        ok = true;
        return {
          ...o,
          extraPassengers: [
            ...o.extraPassengers,
            { id: `pax-${Date.now()}`, name: label, pickup: stop },
          ],
        };
      }),
    );
    return ok;
  }, []);

  const value = useMemo(
    () => ({ offers, ready, postOffer, accept, decline, addPassenger }),
    [offers, ready, postOffer, accept, decline, addPassenger],
  );

  return <DispatchCtx.Provider value={value}>{children}</DispatchCtx.Provider>;
}

export function useDispatch() {
  const ctx = useContext(DispatchCtx);
  if (!ctx) throw new Error("useDispatch outside DispatchProvider");
  return ctx;
}
