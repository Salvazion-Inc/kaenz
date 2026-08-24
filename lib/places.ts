export type PlaceKind = "marina" | "port" | "place";

export type Place = {
  id: string;
  kind: PlaceKind;
  name: string;
  city: string;
  lat: number;
  lng: number;
  image: string;
  minutesByYacht: number;
  minutesByCar: number;
  blurb: { en: string; es: string };
};

export const places: Place[] = [
  {
    id: "miami-beach-marina",
    kind: "marina",
    name: "Miami Beach Marina",
    city: "Miami Beach",
    lat: 25.7785,
    lng: -80.1452,
    image: "/fleet/miami-skyline.jpg",
    minutesByYacht: 18,
    minutesByCar: 45,
    blurb: {
      en: "Prime slip for skyline hops to Brickell and South Beach.",
      es: "Muelle principal para saltos al skyline de Brickell y South Beach.",
    },
  },
  {
    id: "island-gardens",
    kind: "marina",
    name: "Island Gardens Miami",
    city: "Watson Island",
    lat: 25.7851,
    lng: -80.1774,
    image: "/fleet/center-console.jpg",
    minutesByYacht: 12,
    minutesByCar: 28,
    blurb: {
      en: "Closest professional marina to South Beach on the MacArthur Causeway.",
      es: "La marina profesional más cercana a South Beach en la calzada MacArthur.",
    },
  },
  {
    id: "las-olas-marina",
    kind: "marina",
    name: "Las Olas Marina",
    city: "Fort Lauderdale",
    lat: 26.1192,
    lng: -80.108,
    image: "/fleet/ftl-marina.jpg",
    minutesByYacht: 22,
    minutesByCar: 55,
    blurb: {
      en: "Heart of the Venice of America — yachts, Las Olas, and the New River.",
      es: "Corazón de la Venecia de América — yates, Las Olas y el New River.",
    },
  },
  {
    id: "hollywood-marina",
    kind: "marina",
    name: "Hollywood Marina",
    city: "Hollywood",
    lat: 26.0114,
    lng: -80.1238,
    image: "/fleet/sandbar.jpg",
    minutesByYacht: 15,
    minutesByCar: 40,
    blurb: {
      en: "Gateway to the Hollywood Beach sandbar in about 35 minutes from FTL.",
      es: "Puerta al sandbar de Hollywood Beach en unos 35 minutos desde FTL.",
    },
  },
  {
    id: "palm-beach-docks",
    kind: "port",
    name: "Palm Beach Town Docks",
    city: "Palm Beach",
    lat: 26.7056,
    lng: -80.0364,
    image: "/fleet/sunset.jpg",
    minutesByYacht: 45,
    minutesByCar: 90,
    blurb: {
      en: "Sunset run from Fort Lauderdale — romance on the Intracoastal.",
      es: "Travesía al atardecer desde Fort Lauderdale por el Intracoastal.",
    },
  },
  {
    id: "dinner-key",
    kind: "marina",
    name: "Dinner Key Marina",
    city: "Coconut Grove",
    lat: 25.7274,
    lng: -80.2347,
    image: "/fleet/yacht-1.jpg",
    minutesByYacht: 20,
    minutesByCar: 38,
    blurb: {
      en: "Coconut Grove classic. Easy Biscayne Bay cruising.",
      es: "Clásico de Coconut Grove. Crucero fácil por Biscayne Bay.",
    },
  },
  {
    id: "haulover",
    kind: "marina",
    name: "Haulover Park Marina",
    city: "North Miami Beach",
    lat: 25.9029,
    lng: -80.1231,
    image: "/hero-poster.jpg",
    minutesByYacht: 16,
    minutesByCar: 35,
    blurb: {
      en: "Ocean inlet access. Skip the bridges north of Miami Beach.",
      es: "Acceso al océano. Evita los puentes al norte de Miami Beach.",
    },
  },
  {
    id: "port-everglades",
    kind: "port",
    name: "Port Everglades",
    city: "Fort Lauderdale",
    lat: 26.094,
    lng: -80.115,
    image: "/fleet/ftl-marina.jpg",
    minutesByYacht: 10,
    minutesByCar: 30,
    blurb: {
      en: "Deep-water port. Meet cruise guests by yacht instead of by car.",
      es: "Puerto de aguas profundas. Recoge a cruceristas en yate, no en auto.",
    },
  },
  {
    id: "port-miami",
    kind: "port",
    name: "PortMiami",
    city: "Miami",
    lat: 25.778,
    lng: -80.177,
    image: "/fleet/miami-skyline.jpg",
    minutesByYacht: 8,
    minutesByCar: 32,
    blurb: {
      en: "Cruise capital of the world. Water transfer beats downtown traffic.",
      es: "Capital mundial de cruceros. El traslado por agua gana al tráfico.",
    },
  },
  {
    id: "hollywood-sandbar",
    kind: "place",
    name: "Hollywood Beach Sandbar",
    city: "Hollywood",
    lat: 26.021,
    lng: -80.114,
    image: "/fleet/sandbar.jpg",
    minutesByYacht: 35,
    minutesByCar: 0,
    blurb: {
      en: "Anchor, swim, paddle. The family-day sandbar from Fort Lauderdale.",
      es: "Ancla, nado y paddle. El sandbar familiar desde Fort Lauderdale.",
    },
  },
  {
    id: "brickell",
    kind: "place",
    name: "Brickell Waterfront",
    city: "Miami",
    lat: 25.7603,
    lng: -80.1906,
    image: "/fleet/miami-skyline.jpg",
    minutesByYacht: 18,
    minutesByCar: 42,
    blurb: {
      en: "Miami Beach to Brickell in 18 minutes. Goodbye traffic.",
      es: "De Miami Beach a Brickell en 18 minutos. Adiós tráfico.",
    },
  },
  {
    id: "star-island",
    kind: "place",
    name: "Star Island & Millionaire's Row",
    city: "Miami Beach",
    lat: 25.777,
    lng: -80.151,
    image: "/fleet/center-console.jpg",
    minutesByYacht: 14,
    minutesByCar: 0,
    blurb: {
      en: "Slow cruise past the most photographed waterfront homes in Miami.",
      es: "Crucero lento frente a las casas más fotografiadas de Miami.",
    },
  },
  {
    id: "biscayne-bay",
    kind: "place",
    name: "Biscayne Bay",
    city: "Miami",
    lat: 25.73,
    lng: -80.2,
    image: "/hero-poster.jpg",
    minutesByYacht: 40,
    minutesByCar: 0,
    blurb: {
      en: "Open water, skyline views, and the highway of the future.",
      es: "Aguas abiertas, skyline y la autopista del futuro.",
    },
  },
  {
    id: "intracoastal-sunset",
    kind: "place",
    name: "Intracoastal Sunset",
    city: "Palm Beach",
    lat: 26.68,
    lng: -80.05,
    image: "/fleet/sunset.jpg",
    minutesByYacht: 45,
    minutesByCar: 0,
    blurb: {
      en: "Fort Lauderdale to Palm Beach in 45 minutes at golden hour.",
      es: "De Fort Lauderdale a Palm Beach en 45 minutos al atardecer.",
    },
  },
  {
    id: "south-beach",
    kind: "place",
    name: "South Beach",
    city: "Miami Beach",
    lat: 25.7826,
    lng: -80.134,
    image: "/fleet/yacht-1.jpg",
    minutesByYacht: 10,
    minutesByCar: 25,
    blurb: {
      en: "Arrive by water. No valet line on Ocean Drive.",
      es: "Llega por agua. Sin fila de valet en Ocean Drive.",
    },
  },
];

export function placeById(id: string) {
  return places.find((p) => p.id === id);
}

export function placesByKind(kind: PlaceKind | "all") {
  if (kind === "all") return places;
  return places.filter((p) => p.kind === kind);
}
