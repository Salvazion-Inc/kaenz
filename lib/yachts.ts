import type { Localized } from "./locale";

export type Captain = {
  name: string;
  license: string;
  rating: number;
  trips: number;
  photo: string;
  verified: true;
};

export type Yacht = {
  id: string;
  name: string;
  class: string;
  lengthFt: number;
  guests: number;
  hoursMin: number;
  priceFrom: number;
  marina: string;
  marinaId: string;
  image: string;
  lat: number;
  lng: number;
  etaMin: number;
  captain: Captain;
  blurb: Localized;
};

export const yachts: Yacht[] = [
  {
    id: "azure-55",
    name: "Azure 55",
    class: "Motor yacht",
    lengthFt: 55,
    guests: 12,
    hoursMin: 4,
    priceFrom: 1850,
    marina: "Miami Beach Marina",
    marinaId: "miami-beach-marina",
    image: "/fleet/miami-skyline.jpg",
    lat: 25.7785,
    lng: -80.1452,
    etaMin: 8,
    captain: {
      name: "Captain Elena Ruiz",
      license: "USCG OUPV Six-Pack",
      rating: 4.97,
      trips: 412,
      photo: "/crew/sofia.jpg",
      verified: true,
    },
    blurb: {
      en: "Skyline cruiser for Miami Beach to Brickell in 18 minutes.",
      es: "Crucero de skyline: Miami Beach a Brickell en 18 minutos.",
      fr: "Croisière skyline : Miami Beach à Brickell en 18 minutes.",
      it: "Crociera skyline: da Miami Beach a Brickell in 18 minuti.",
    },
  },
  {
    id: "sandbar-42",
    name: "Sandbar 42",
    class: "Day cruiser",
    lengthFt: 42,
    guests: 10,
    hoursMin: 4,
    priceFrom: 1200,
    marina: "Hollywood Marina",
    marinaId: "hollywood-marina",
    image: "/fleet/sandbar.jpg",
    lat: 26.0114,
    lng: -80.1238,
    etaMin: 12,
    captain: {
      name: "Captain Trent Hale",
      license: "USCG Master 50 Ton",
      rating: 4.95,
      trips: 638,
      photo: "/crew/captain.jpg",
      verified: true,
    },
    blurb: {
      en: "Fort Lauderdale to Hollywood Beach in 35 minutes, with sandbar time.",
      es: "Fort Lauderdale a Hollywood Beach en 35 minutos, con sandbar.",
      fr: "Fort Lauderdale à Hollywood Beach en 35 minutes, avec sandbar.",
      it: "Da Fort Lauderdale a Hollywood Beach in 35 minuti, con sandbar.",
    },
  },
  {
    id: "sunset-60",
    name: "Sunset 60",
    class: "Flybridge yacht",
    lengthFt: 60,
    guests: 13,
    hoursMin: 4,
    priceFrom: 2800,
    marina: "Palm Beach Town Docks",
    marinaId: "palm-beach-docks",
    image: "/fleet/sunset.jpg",
    lat: 26.7056,
    lng: -80.0364,
    etaMin: 18,
    captain: {
      name: "Captain Marcus Cole",
      license: "USCG Master 100 Ton",
      rating: 4.99,
      trips: 291,
      photo: "/crew/marcus.jpg",
      verified: true,
    },
    blurb: {
      en: "Fort Lauderdale to Palm Beach in 45 minutes at golden hour.",
      es: "Fort Lauderdale a Palm Beach en 45 minutos al atardecer.",
      fr: "Fort Lauderdale à Palm Beach en 45 minutes à l’heure dorée.",
      it: "Da Fort Lauderdale a Palm Beach in 45 minuti all’ora d’oro.",
    },
  },
  {
    id: "velocity-38",
    name: "Velocity 38",
    class: "Center console",
    lengthFt: 38,
    guests: 8,
    hoursMin: 3,
    priceFrom: 950,
    marina: "Island Gardens Miami",
    marinaId: "island-gardens",
    image: "/fleet/center-console.jpg",
    lat: 25.7851,
    lng: -80.1774,
    etaMin: 6,
    captain: {
      name: "Captain Will Park",
      license: "USCG OUPV Six-Pack",
      rating: 4.92,
      trips: 520,
      photo: "/crew/william.jpg",
      verified: true,
    },
    blurb: {
      en: "Fast hop across Biscayne Bay. Skip the causeways.",
      es: "Salto rápido por Biscayne Bay. Olvídate de las calzadas.",
      fr: "Saut rapide sur Biscayne Bay. Oubliez les chaussées.",
      it: "Salto veloce su Biscayne Bay. Dimentica le calzate.",
    },
  },
  {
    id: "las-olas-70",
    name: "Las Olas 70",
    class: "Luxury motor yacht",
    lengthFt: 70,
    guests: 13,
    hoursMin: 4,
    priceFrom: 3500,
    marina: "Las Olas Marina",
    marinaId: "las-olas-marina",
    image: "/fleet/ftl-marina.jpg",
    lat: 26.1192,
    lng: -80.108,
    etaMin: 14,
    captain: {
      name: "Captain Mia Chen",
      license: "USCG Master 100 Ton",
      rating: 4.98,
      trips: 187,
      photo: "/crew/mia.jpg",
      verified: true,
    },
    blurb: {
      en: "Flagship from Fort Lauderdale — celebrations, clients, sunsets.",
      es: "Buque insignia desde Fort Lauderdale — celebraciones y atardeceres.",
      fr: "Navire amiral depuis Fort Lauderdale — célébrations, clients, couchers de soleil.",
      it: "Ammiraglia da Fort Lauderdale — celebrazioni, clienti, tramonti.",
    },
  },
];

export const marinas = [
  "Miami Beach Marina",
  "Island Gardens Miami",
  "Las Olas Marina",
  "Hollywood Marina",
  "Palm Beach Town Docks",
];

export const destinations = [
  "Brickell",
  "Miami Beach",
  "Hollywood Beach sandbar",
  "Fort Lauderdale",
  "Palm Beach",
  "Biscayne Bay cruise",
  "Sunset Intracoastal",
];

export function yachtById(id: string) {
  return yachts.find((y) => y.id === id);
}

export function formatUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function estimateFare(
  yacht: Yacht,
  kind: "commute" | "tour" | "special",
) {
  const hours =
    kind === "commute" ? Math.max(2, yacht.hoursMin - 2) : yacht.hoursMin;
  const multiplier = kind === "special" ? 1.35 : kind === "commute" ? 0.55 : 1;
  const total = Math.round(yacht.priceFrom * multiplier);
  const platform = Math.round(total * 0.3);
  const owner = Math.round(total * 0.4);
  const captain = total - platform - owner;
  return { hours, total, platform, owner, captain };
}
