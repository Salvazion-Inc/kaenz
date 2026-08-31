"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  clampHours,
  defaultHoursFor,
  estimateFare,
  type TripKind,
  type WhenMode,
} from "./pricing";
import { placeById, places, type Place } from "./places";
import { DEFAULT_YACHT_ID, yachtById, yachts, type Yacht } from "./yachts";

export type { TripKind, WhenMode };
export const TRIP_STEPS = [
  "requested",
  "approved",
  "waiting",
  "underway",
  "paid",
  "rated",
] as const;

export type TripStep = (typeof TRIP_STEPS)[number];
export type TripStatus = "draft" | TripStep;

export function parseTripStatus(value: unknown): TripStatus {
  if (value === "confirmed") return "paid";
  if (value === "draft") return "draft";
  if (TRIP_STEPS.includes(value as TripStep)) return value as TripStep;
  return "draft";
}
export type PayMethod = "credit" | "debit" | "solana" | "stripe";
export type PaymentStatus = "unpaid" | "pending" | "paid";

function parsePaymentStatus(value: unknown): PaymentStatus {
  if (value === "pending" || value === "paid") return value;
  return "unpaid";
}

export type TripDraft = {
  kind: TripKind;
  whenMode: WhenMode;
  originId: string;
  destinationId: string;
  yachtId: string;
  date: string;
  time: string;
  hours: number;
  guests: number;
  name: string;
  email: string;
  phone: string;
  payMethod: PayMethod;
  status: TripStatus;
  bookingId?: string;
  paymentStatus: PaymentStatus;
  stripeSessionId?: string;
  stripePaymentIntent?: string;
  gratuityPct: number;
  tripProgress: number;
  rating: number;
  onboardCrewIds: string[];
};

const KEY = "kaenz-trip-v1";

const empty: TripDraft = {
  kind: "commute",
  whenMode: "now",
  originId: "miami-beach-marina",
  destinationId: "brickell",
  yachtId: DEFAULT_YACHT_ID,
  date: "",
  time: "",
  hours: defaultHoursFor("commute"),
  guests: 4,
  name: "",
  email: "",
  phone: "",
  payMethod: "stripe",
  status: "draft",
  paymentStatus: "unpaid",
  gratuityPct: 0,
  tripProgress: 0,
  rating: 0,
  onboardCrewIds: [],
};

type Ctx = {
  trip: TripDraft;
  setTrip: (patch: Partial<TripDraft>) => void;
  reset: () => void;
  yacht: Yacht | undefined;
  fare: ReturnType<typeof estimateFare> | null;
  originName: string;
  destinationName: string;
  originPlace: Place | undefined;
  destinationPlace: Place | undefined;
  ready: boolean;
  fleet: Yacht[];
  allPlaces: Place[];
  addPartnerPlace: (place: Place) => void;
};

const TripCtx = createContext<Ctx | null>(null);

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [trip, setState] = useState<TripDraft>(empty);
  const [hydrated, setHydrated] = useState(false);
  const [listings, setListings] = useState<Yacht[]>([]);
  const [partners, setPartners] = useState<Place[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<TripDraft>;
        const kind = parsed.kind || empty.kind;
        const yachtId = yachtById(String(parsed.yachtId || ""))
          ? String(parsed.yachtId)
          : empty.yachtId;
        setState({
          ...empty,
          ...parsed,
          kind,
          yachtId,
          whenMode:
            parsed.whenMode === "now"
              ? "now"
              : parsed.whenMode === "schedule" || parsed.date
                ? "schedule"
                : "now",
          hours: clampHours(kind, parsed.hours || defaultHoursFor(kind)),
          status: parseTripStatus(parsed.status),
          tripProgress: Math.min(1, Math.max(0, Number(parsed.tripProgress) || 0)),
          rating: Math.min(5, Math.max(0, Number(parsed.rating) || 0)),
          onboardCrewIds: Array.isArray(parsed.onboardCrewIds)
            ? parsed.onboardCrewIds.map(String)
            : [],
          payMethod:
            parsed.payMethod === "debit" ||
            parsed.payMethod === "solana" ||
            parsed.payMethod === "credit"
              ? parsed.payMethod
              : "stripe",
          paymentStatus: parsePaymentStatus(parsed.paymentStatus),
          stripeSessionId: parsed.stripeSessionId
            ? String(parsed.stripeSessionId)
            : undefined,
          stripePaymentIntent: parsed.stripePaymentIntent
            ? String(parsed.stripePaymentIntent)
            : undefined,
        });
      }
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
    fetch("/api/marinas")
      .then((res) => res.json())
      .then((data) => setPartners(Array.isArray(data.places) ? data.places : []))
      .catch(() => setPartners([]));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY, JSON.stringify(trip));
  }, [trip, hydrated]);

  const setTrip = useCallback((patch: Partial<TripDraft>) => {
    setState((t) => ({ ...t, ...patch }));
  }, []);

  const reset = useCallback(() => setState(empty), []);

  const addPartnerPlace = useCallback((place: Place) => {
    setPartners((cur) => [place, ...cur.filter((item) => item.id !== place.id)]);
  }, []);

  const value = useMemo(() => {
    const fleet = [...listings, ...yachts];
    const allPlaces = [...partners, ...places];
    const findPlace = (id: string) =>
      partners.find((item) => item.id === id) || placeById(id);
    const yacht = yachtById(trip.yachtId) || listings.find((item) => item.id === trip.yachtId);
    const originPlace = findPlace(trip.originId);
    const destinationPlace = findPlace(trip.destinationId);
    const fare = yacht
      ? estimateFare(yacht, trip.kind, {
          hours: trip.hours || defaultHoursFor(trip.kind, yacht),
          guests: trip.guests,
          date: trip.date,
          origin: originPlace,
          destination: destinationPlace,
          whenMode: trip.whenMode,
        })
      : null;
    return {
      trip,
      setTrip,
      reset,
      yacht,
      fare,
      originName: originPlace?.name ?? trip.originId,
      destinationName: destinationPlace?.name ?? trip.destinationId,
      originPlace,
      destinationPlace,
      ready: hydrated,
      fleet,
      allPlaces,
      addPartnerPlace,
    };
  }, [trip, hydrated, listings, partners, setTrip, reset, addPartnerPlace]);

  return <TripCtx.Provider value={value}>{children}</TripCtx.Provider>;
}

export function useTrip() {
  const ctx = useContext(TripCtx);
  if (!ctx) throw new Error("useTrip outside TripProvider");
  return ctx;
}
