"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { marinaShares } from "./marina-listings";
import { placeById, places, type Place } from "./places";
import { estimateFare, yachtById, yachts, type Yacht } from "./yachts";

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
  fare:
    | (ReturnType<typeof estimateFare> & {
        marina: ReturnType<typeof marinaShares>;
      })
    | null;
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
    fetch("/api/marinas")
      .then((res) => res.json())
      .then((data) => setPartners(Array.isArray(data.places) ? data.places : []))
      .catch(() => setPartners([]));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY, JSON.stringify(trip));
  }, [trip, hydrated]);

  const value = useMemo(() => {
    const fleet = [...listings, ...yachts];
    const allPlaces = [...partners, ...places];
    const findPlace = (id: string) =>
      partners.find((item) => item.id === id) || placeById(id);
    const yacht = yachtById(trip.yachtId) || listings.find((item) => item.id === trip.yachtId);
    const originPlace = findPlace(trip.originId);
    const destinationPlace = findPlace(trip.destinationId);
    const base =
      yacht && yacht.priceFrom > 0 ? estimateFare(yacht, trip.kind) : null;
    const marina = base
      ? marinaShares(base.total, originPlace, destinationPlace)
      : null;
    const fare =
      base && marina
        ? {
            ...base,
            marina,
            platform: Math.max(0, base.total - base.owner - base.captain - marina.total),
          }
        : null;
    return {
      trip,
      setTrip: (patch: Partial<TripDraft>) =>
        setState((t) => ({ ...t, ...patch })),
      reset: () => setState(empty),
      yacht,
      fare,
      originName: originPlace?.name ?? trip.originId,
      destinationName: destinationPlace?.name ?? trip.destinationId,
      originPlace,
      destinationPlace,
      ready: hydrated,
      fleet,
      allPlaces,
      addPartnerPlace: (place: Place) =>
        setPartners((cur) => [place, ...cur.filter((item) => item.id !== place.id)]),
    };
  }, [trip, hydrated, listings, partners]);

  return <TripCtx.Provider value={value}>{children}</TripCtx.Provider>;
}

export function useTrip() {
  const ctx = useContext(TripCtx);
  if (!ctx) throw new Error("useTrip outside TripProvider");
  return ctx;
}
