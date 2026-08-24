"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { estimateFare, yachtById, type Yacht } from "./yachts";
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
};

const TripCtx = createContext<Ctx | null>(null);

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [trip, setState] = useState<TripDraft>(empty);
  const [hydrated, setHydrated] = useState(false);

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
    if (!hydrated) return;
    localStorage.setItem(KEY, JSON.stringify(trip));
  }, [trip, hydrated]);

  const value = useMemo(() => {
    const yacht = yachtById(trip.yachtId);
    const fare = yacht ? estimateFare(yacht, trip.kind) : null;
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
    };
  }, [trip, hydrated]);

  return <TripCtx.Provider value={value}>{children}</TripCtx.Provider>;
}

export function useTrip() {
  const ctx = useContext(TripCtx);
  if (!ctx) throw new Error("useTrip outside TripProvider");
  return ctx;
}
