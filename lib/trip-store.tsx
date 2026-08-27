"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { estimateFare, yachtById, yachts, type Yacht } from "./yachts";
import { placeById } from "./places";

export type TripKind = "commute" | "tour" | "special";
export type TripStatus = "draft" | "requested" | "confirmed";
export type PayMethod = "card" | "solana";

export type TripDraft = {
  kind: TripKind;
  originId: string;
  destinationId: string;
  yachtId: string;
  date: string;
  time: string;
  guests: number;
  name: string;
  email: string;
  phone: string;
  payMethod: PayMethod;
  status: TripStatus;
  bookingId?: string;
  gratuityPct: number;
};

const KEY = "kaenz-trip-v1";

const empty: TripDraft = {
  kind: "commute",
  originId: "miami-beach-marina",
  destinationId: "brickell",
  yachtId: "velocity-38",
  date: "",
  time: "",
  guests: 4,
  name: "",
  email: "",
  phone: "",
  payMethod: "card",
  status: "draft",
  gratuityPct: 0,
};

type Ctx = {
  trip: TripDraft;
  setTrip: (patch: Partial<TripDraft>) => void;
  reset: () => void;
  yacht: Yacht | undefined;
  fare: ReturnType<typeof estimateFare> | null;
  originName: string;
  destinationName: string;
  ready: boolean;
  fleet: Yacht[];
};

const TripCtx = createContext<Ctx | null>(null);

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [trip, setState] = useState<TripDraft>(empty);
  const [hydrated, setHydrated] = useState(false);
  const [listings, setListings] = useState<Yacht[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...empty, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    fetch("/api/yachts")
      .then((res) => res.json())
      .then((data) => setListings(Array.isArray(data.yachts) ? data.yachts : []))
      .catch(() => setListings([]));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY, JSON.stringify(trip));
  }, [trip, hydrated]);

  const value = useMemo(() => {
    const fleet = [...listings, ...yachts];
    const yacht = yachtById(trip.yachtId) || listings.find((item) => item.id === trip.yachtId);
    const fare =
      yacht && yacht.priceFrom > 0 ? estimateFare(yacht, trip.kind) : null;
    return {
      trip,
      setTrip: (patch: Partial<TripDraft>) =>
        setState((t) => ({ ...t, ...patch })),
      reset: () => setState(empty),
      yacht,
      fare,
      originName: placeById(trip.originId)?.name ?? trip.originId,
      destinationName:
        placeById(trip.destinationId)?.name ?? trip.destinationId,
      ready: hydrated,
      fleet,
    };
  }, [trip, hydrated, listings]);

  return <TripCtx.Provider value={value}>{children}</TripCtx.Provider>;
}

export function useTrip() {
  const ctx = useContext(TripCtx);
  if (!ctx) throw new Error("useTrip outside TripProvider");
  return ctx;
}
