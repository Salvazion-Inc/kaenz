export type Yacht = {
  id: string;
  name: string;
  class: string;
  lengthFt: number;
  guests: number;
  hoursMin: number;
  priceFrom: number;
  marina: string;
  image: string;
  blurb: { en: string; es: string };
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
    image: "/fleet/miami-skyline.jpg",
    blurb: {
      en: "Skyline cruiser for Miami Beach to Brickell in 18 minutes.",
      es: "Crucero de skyline: Miami Beach a Brickell en 18 minutos.",
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
    image: "/fleet/sandbar.jpg",
    blurb: {
      en: "Fort Lauderdale to Hollywood Beach in 35 minutes, with sandbar time.",
      es: "Fort Lauderdale a Hollywood Beach en 35 minutos, con sandbar.",
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
    image: "/fleet/sunset.jpg",
    blurb: {
      en: "Fort Lauderdale to Palm Beach in 45 minutes at golden hour.",
      es: "Fort Lauderdale a Palm Beach en 45 minutos al atardecer.",
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
    image: "/fleet/center-console.jpg",
    blurb: {
      en: "Fast hop across Biscayne Bay. Skip the causeways.",
      es: "Salto rápido por Biscayne Bay. Olvídate de las calzadas.",
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
    image: "/fleet/ftl-marina.jpg",
    blurb: {
      en: "Flagship from Fort Lauderdale — celebrations, clients, sunsets.",
      es: "Buque insignia desde Fort Lauderdale — celebraciones y atardeceres.",
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
