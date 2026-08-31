import type { Locale } from "./locale";
import type { Yacht } from "./yachts";

export const YACHT_TRAITS = ["luxurious", "fast", "small"] as const;
export type YachtTrait = (typeof YACHT_TRAITS)[number];

export const CAPTAIN_LANGS = ["en", "es", "pt", "fr"] as const;
export type CaptainLang = (typeof CAPTAIN_LANGS)[number];

export const CAPTAIN_LANG_FLAGS: Record<CaptainLang, string> = {
  en: "/flags/usa.svg",
  es: "/flags/spain.svg",
  pt: "/flags/brazil.svg",
  fr: "/flags/france.svg",
};

export type YachtListing = {
  id: string;
  slug: string;
  createdBy: string;
  status: "listed";
  ownerName: string;
  ownerWallet: string;
  name: string;
  hin: string;
  guests: number;
  traits: YachtTrait[];
  homePort: string;
  photos: string[];
  captainName: string;
  captainPhoto: string;
  captainLanguages: CaptainLang[];
  captainRegion: string;
  captainWallet: string;
  createdAt: string;
};

export function isSolanaWallet(value: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value.trim());
}

export function isHin(value: string) {
  const hin = value.replace(/\s+/g, "").toUpperCase();
  return /^[A-Z0-9]{12,17}$/.test(hin);
}

export function parseTraits(value: unknown): YachtTrait[] {
  const raw = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((part) => part.trim());
  return YACHT_TRAITS.filter((trait) => raw.includes(trait));
}

export function parseLangs(value: unknown): CaptainLang[] {
  const raw = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((part) => part.trim());
  return CAPTAIN_LANGS.filter((lang) => raw.includes(lang));
}

export function listingToYacht(row: YachtListing): Yacht {
  const classLabel = row.traits
    .map((trait) => trait[0].toUpperCase() + trait.slice(1))
    .join(" · ");
  return {
    id: row.id,
    name: row.name,
    class: classLabel || "Yacht",
    lengthFt: 0,
    guests: row.guests,
    hoursMin: 4,
    marina: row.homePort,
    marinaId: row.slug,
    image: row.photos[0] || "",
    lat: Number.NaN,
    lng: Number.NaN,
    etaMin: 0,
    captain: {
      name: row.captainName,
      license: "MMC",
      rating: 0,
      trips: 0,
      photo: row.captainPhoto,
      verified: false,
    },
    blurb: {
      en: `${row.homePort} · ${row.captainRegion}`,
      es: `${row.homePort} · ${row.captainRegion}`,
      fr: `${row.homePort} · ${row.captainRegion}`,
      it: `${row.homePort} · ${row.captainRegion}`,
      pt: `${row.homePort} · ${row.captainRegion}`,
    },
    listing: true,
    photos: row.photos,
    traits: row.traits,
    hin: row.hin,
    captainLanguages: row.captainLanguages,
    captainRegion: row.captainRegion,
  };
}

export function traitLabel(trait: YachtTrait, locale: Locale) {
  const labels: Record<YachtTrait, Record<Locale, string>> = {
    luxurious: {
      en: "Luxurious",
      es: "Luxurious",
      fr: "Luxurious",
      it: "Luxurious",
      pt: "Luxurious",
    },
    fast: {
      en: "Fast",
      es: "Fast",
      fr: "Fast",
      it: "Fast",
      pt: "Fast",
    },
    small: {
      en: "Small",
      es: "Small",
      fr: "Small",
      it: "Small",
      pt: "Small",
    },
  };
  return labels[trait][locale];
}
