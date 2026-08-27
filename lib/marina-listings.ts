import type { Localized } from "./locale";
import type { Place, PlaceKind } from "./places";

export type MarinaListing = {
  id: string;
  slug: string;
  createdBy: string;
  kind: PlaceKind;
  name: string;
  lat: number;
  lng: number;
  address: string;
  region: string;
  dockmaster: string;
  phone: string;
  website: string;
  wallet: string;
  createdAt: string;
};

export function isCoord(lat: number, lng: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function isWebsite(value: string) {
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeWebsite(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  return raw.startsWith("http://") || raw.startsWith("https://")
    ? raw
    : `https://${raw}`;
}

function blurbFor(address: string, region: string): Localized {
  const line = [address, region].filter(Boolean).join(" · ");
  return { en: line, es: line, fr: line, it: line, pt: line };
}

export function listingToPlace(row: MarinaListing): Place {
  return {
    id: row.id,
    kind: row.kind === "port" ? "port" : "marina",
    name: row.name,
    city: row.region,
    lat: row.lat,
    lng: row.lng,
    image: "",
    minutesByYacht: 0,
    minutesByCar: 0,
    blurb: blurbFor(row.address, row.region),
    partner: true,
    address: row.address,
    region: row.region,
    dockmaster: row.dockmaster,
    phone: row.phone,
    website: row.website,
  };
}

export function marinaShares(
  total: number,
  origin?: Place,
  destination?: Place,
) {
  const same =
    Boolean(origin && destination && origin.id === destination.id);
  if (same) {
    const fee = Math.round(total * 0.07);
    return {
      roundTrip: true,
      origin: fee,
      destination: 0,
      total: fee,
    };
  }
  const originFee = origin ? Math.round(total * 0.035) : 0;
  const destFee = destination ? Math.round(total * 0.035) : 0;
  return {
    roundTrip: false,
    origin: originFee,
    destination: destFee,
    total: originFee + destFee,
  };
}
