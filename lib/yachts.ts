import type { Localized } from "./locale";

export type YachtClass = "fast" | "small" | "luxurious";

export type Captain = {
  name: string;
  license: string;
  rating: number;
  trips: number;
  photo: string;
  verified: boolean;
};

export type Yacht = {
  id: string;
  name: string;
  class: string;
  lengthFt: number;
  guests: number;
  hoursMin: number;
  marina: string;
  marinaId: string;
  image: string;
  lat: number;
  lng: number;
  etaMin: number;
  captain: Captain;
  blurb: Localized;
  traits: YachtClass[];
  listing?: boolean;
  photos?: string[];
  hin?: string;
  captainLanguages?: Array<"en" | "es" | "pt" | "fr">;
  captainRegion?: string;
};

function blurb(en: string, es: string, fr: string, it: string, pt: string): Localized {
  return { en, es, fr, it, pt };
}

export const yachts: Yacht[] = [
  {
    id: "azure-55",
    name: "Azure 55",
    class: "Motor yacht",
    lengthFt: 55,
    guests: 12,
    hoursMin: 4,
    marina: "Miami Beach Marina",
    marinaId: "miami-beach-marina",
    image: "/fleet/miami-skyline.jpg",
    lat: 25.7785,
    lng: -80.1452,
    etaMin: 8,
    traits: ["luxurious"],
    captain: {
      name: "Captain Elena Ruiz",
      license: "USCG OUPV Six-Pack",
      rating: 4.97,
      trips: 412,
      photo: "/crew/sofia.jpg",
      verified: true,
    },
    blurb: blurb(
      "Skyline cruiser for Miami Beach to Brickell in 18 minutes.",
      "Crucero de skyline: Miami Beach a Brickell en 18 minutos.",
      "Croisière skyline : Miami Beach à Brickell en 18 minutes.",
      "Crociera skyline: da Miami Beach a Brickell in 18 minuti.",
      "Cruzeiro de skyline: Miami Beach a Brickell em 18 minutos.",
    ),
  },
  {
    id: "sandbar-42",
    name: "Sandbar 42",
    class: "Day cruiser",
    lengthFt: 42,
    guests: 10,
    hoursMin: 4,
    marina: "Hollywood Marina",
    marinaId: "hollywood-marina",
    image: "/fleet/sandbar.jpg",
    lat: 26.0114,
    lng: -80.1238,
    etaMin: 12,
    traits: ["small"],
    captain: {
      name: "Captain Trent Hale",
      license: "USCG Master 50 Ton",
      rating: 4.95,
      trips: 638,
      photo: "/crew/captain.jpg",
      verified: true,
    },
    blurb: blurb(
      "Fort Lauderdale to Hollywood Beach in 35 minutes, with sandbar time.",
      "Fort Lauderdale a Hollywood Beach en 35 minutos, con sandbar.",
      "Fort Lauderdale à Hollywood Beach en 35 minutes, avec sandbar.",
      "Da Fort Lauderdale a Hollywood Beach in 35 minuti, con sandbar.",
      "De Fort Lauderdale a Hollywood Beach em 35 minutos, com sandbar.",
    ),
  },
  {
    id: "sunset-60",
    name: "Sunset 60",
    class: "Flybridge yacht",
    lengthFt: 60,
    guests: 13,
    hoursMin: 4,
    marina: "Palm Beach Town Docks",
    marinaId: "palm-beach-docks",
    image: "/fleet/sunset.jpg",
    lat: 26.7056,
    lng: -80.0364,
    etaMin: 18,
    traits: ["luxurious"],
    captain: {
      name: "Captain Marcus Cole",
      license: "USCG Master 100 Ton",
      rating: 4.99,
      trips: 291,
      photo: "/crew/marcus.jpg",
      verified: true,
    },
    blurb: blurb(
      "Fort Lauderdale to Palm Beach in 45 minutes at golden hour.",
      "Fort Lauderdale a Palm Beach en 45 minutos al atardecer.",
      "Fort Lauderdale à Palm Beach en 45 minutes à l’heure dorée.",
      "Da Fort Lauderdale a Palm Beach in 45 minuti all’ora d’oro.",
      "De Fort Lauderdale a Palm Beach em 45 minutos na hora dourada.",
    ),
  },
  {
    id: "velocity-38",
    name: "Velocity 38",
    class: "Center console",
    lengthFt: 38,
    guests: 8,
    hoursMin: 3,
    marina: "Island Gardens Miami",
    marinaId: "island-gardens",
    image: "/fleet/center-console.jpg",
    lat: 25.7851,
    lng: -80.1774,
    etaMin: 6,
    traits: ["fast", "small"],
    captain: {
      name: "Captain Will Park",
      license: "USCG OUPV Six-Pack",
      rating: 4.92,
      trips: 520,
      photo: "/crew/william.jpg",
      verified: true,
    },
    blurb: blurb(
      "Fast hop across Biscayne Bay. Skip the causeways.",
      "Salto rápido por Biscayne Bay. Olvídate de las calzadas.",
      "Saut rapide sur Biscayne Bay. Oubliez les chaussées.",
      "Salto veloce su Biscayne Bay. Dimentica le calzate.",
      "Salto rápido pela Biscayne Bay. Esqueça as calçadas.",
    ),
  },
  {
    id: "las-olas-70",
    name: "Las Olas 70",
    class: "Motor yacht",
    lengthFt: 70,
    guests: 13,
    hoursMin: 4,
    marina: "Las Olas Marina",
    marinaId: "las-olas-marina",
    image: "/fleet/ftl-marina.jpg",
    lat: 26.1192,
    lng: -80.108,
    etaMin: 14,
    traits: ["luxurious"],
    captain: {
      name: "Captain Mia Chen",
      license: "USCG Master 100 Ton",
      rating: 4.98,
      trips: 187,
      photo: "/crew/mia.jpg",
      verified: true,
    },
    blurb: blurb(
      "Flagship from Fort Lauderdale — celebrations, clients, sunsets.",
      "Buque insignia desde Fort Lauderdale — celebraciones y atardeceres.",
      "Navire amiral depuis Fort Lauderdale — célébrations, clients, couchers de soleil.",
      "Ammiraglia da Fort Lauderdale — celebrazioni, clienti, tramonti.",
      "Iate-chefe de Fort Lauderdale — celebrações, clientes, pores do sol.",
    ),
  },
  {
    id: "biscayne-32",
    name: "Biscayne 32",
    class: "Walkaround",
    lengthFt: 32,
    guests: 6,
    hoursMin: 3,
    marina: "Dinner Key Marina",
    marinaId: "dinner-key",
    image: "/fleet/yacht-1.jpg",
    lat: 25.7274,
    lng: -80.2347,
    etaMin: 10,
    traits: ["small"],
    captain: {
      name: "Captain Sofia Alvarez",
      license: "USCG OUPV Six-Pack",
      rating: 4.9,
      trips: 276,
      photo: "/crew/sofia.jpg",
      verified: true,
    },
    blurb: blurb(
      "Compact Coconut Grove boat for short Biscayne Bay hops.",
      "Bote compacto de Coconut Grove para saltos cortos por Biscayne Bay.",
      "Bateau compact de Coconut Grove pour de courts sauts sur Biscayne Bay.",
      "Barca compatta di Coconut Grove per salti brevi su Biscayne Bay.",
      "Barco compacto de Coconut Grove para saltos curtos na Biscayne Bay.",
    ),
  },
  {
    id: "haulover-46",
    name: "Haulover 46",
    class: "Center console",
    lengthFt: 46,
    guests: 10,
    hoursMin: 3,
    marina: "Haulover Park Marina",
    marinaId: "haulover",
    image: "/fleet/center-console.jpg",
    lat: 25.9029,
    lng: -80.1231,
    etaMin: 9,
    traits: ["fast"],
    captain: {
      name: "Captain Diego Santos",
      license: "USCG Master 50 Ton",
      rating: 4.94,
      trips: 351,
      photo: "/crew/william.jpg",
      verified: true,
    },
    blurb: blurb(
      "Ocean-inlet runner. North Beach and sandbars without the bridges.",
      "Sale al océano por Haulover. North Beach y sandbars sin puentes.",
      "Sortie océan par Haulover. North Beach et sandbars sans les ponts.",
      "Uscita oceano da Haulover. North Beach e sandbar senza i ponti.",
      "Sai ao oceano por Haulover. North Beach e sandbars sem as pontes.",
    ),
  },
  {
    id: "grove-28",
    name: "Grove 28",
    class: "Bowrider",
    lengthFt: 28,
    guests: 4,
    hoursMin: 2,
    marina: "Dinner Key Marina",
    marinaId: "dinner-key",
    image: "/fleet/yacht-1.jpg",
    lat: 25.7274,
    lng: -80.2347,
    etaMin: 7,
    traits: ["small", "fast"],
    captain: {
      name: "Captain Nora Blake",
      license: "USCG OUPV Six-Pack",
      rating: 4.88,
      trips: 198,
      photo: "/crew/emily.jpg",
      verified: true,
    },
    blurb: blurb(
      "Four-person sprint across the bay. Built for commute hops.",
      "Sprint para cuatro por la bahía. Hecho para commute.",
      "Sprint pour quatre sur la baie. Conçu pour les trajets.",
      "Sprint per quattro sulla baia. Pensato per i tragitti.",
      "Sprint para quatro na baía. Feito para commute.",
    ),
  },
  {
    id: "brickell-65",
    name: "Brickell 65",
    class: "Motor yacht",
    lengthFt: 65,
    guests: 13,
    hoursMin: 4,
    marina: "Island Gardens Miami",
    marinaId: "island-gardens",
    image: "/fleet/miami-skyline.jpg",
    lat: 25.7851,
    lng: -80.1774,
    etaMin: 8,
    traits: ["luxurious"],
    captain: {
      name: "Captain Camille Dubois",
      license: "USCG Master 100 Ton",
      rating: 4.96,
      trips: 164,
      photo: "/crew/mia.jpg",
      verified: true,
    },
    blurb: blurb(
      "Client dinners and skyline nights from Watson Island.",
      "Cenas de clientes y noches de skyline desde Watson Island.",
      "Dîners clients et nuits skyline depuis Watson Island.",
      "Cene clienti e notti skyline da Watson Island.",
      "Jantares de clientes e noites de skyline em Watson Island.",
    ),
  },
  {
    id: "everglades-52",
    name: "Everglades 52",
    class: "Express cruiser",
    lengthFt: 52,
    guests: 12,
    hoursMin: 4,
    marina: "Port Everglades",
    marinaId: "port-everglades",
    image: "/fleet/ftl-marina.jpg",
    lat: 26.094,
    lng: -80.115,
    etaMin: 11,
    traits: ["fast"],
    captain: {
      name: "Captain James Okonkwo",
      license: "USCG Master 50 Ton",
      rating: 4.93,
      trips: 244,
      photo: "/crew/marcus.jpg",
      verified: true,
    },
    blurb: blurb(
      "Meet cruise guests by water. Port Everglades to the beach, fast.",
      "Recoge cruceristas por agua. Port Everglades a la playa, rápido.",
      "Récupérez les croisiéristes par l’eau. Port Everglades à la plage, vite.",
      "Raccogli i crocieristi via acqua. Da Port Everglades alla spiaggia, veloce.",
      "Busque passageiros de cruzeiro pela água. Port Everglades à praia, rápido.",
    ),
  },
  {
    id: "portmiami-40",
    name: "PortMiami 40",
    class: "Center console",
    lengthFt: 40,
    guests: 8,
    hoursMin: 3,
    marina: "PortMiami",
    marinaId: "port-miami",
    image: "/fleet/center-console.jpg",
    lat: 25.778,
    lng: -80.177,
    etaMin: 6,
    traits: ["fast", "small"],
    captain: {
      name: "Captain Rafael Costa",
      license: "USCG OUPV Six-Pack",
      rating: 4.91,
      trips: 389,
      photo: "/crew/william.jpg",
      verified: true,
    },
    blurb: blurb(
      "Downtown water transfer. Beats PortMiami traffic every time.",
      "Traslado por agua al downtown. Le gana al tráfico de PortMiami.",
      "Transfert par eau vers le centre. Gagne à chaque fois sur PortMiami.",
      "Trasferimento via acqua in centro. Vince sempre sul traffico di PortMiami.",
      "Traslado pela água ao centro. Ganha do trânsito de PortMiami.",
    ),
  },
  {
    id: "palm-flyer-36",
    name: "Palm Flyer 36",
    class: "Center console",
    lengthFt: 36,
    guests: 8,
    hoursMin: 3,
    marina: "Palm Beach Town Docks",
    marinaId: "palm-beach-docks",
    image: "/fleet/sunset.jpg",
    lat: 26.7056,
    lng: -80.0364,
    etaMin: 15,
    traits: ["fast"],
    captain: {
      name: "Captain Hannah Kim",
      license: "USCG Master 50 Ton",
      rating: 4.95,
      trips: 218,
      photo: "/crew/emily.jpg",
      verified: true,
    },
    blurb: blurb(
      "Quick Intracoastal runs along Palm Beach.",
      "Tramos rápidos por el Intracoastal en Palm Beach.",
      "Trajets rapides sur l’Intracoastal à Palm Beach.",
      "Tratti veloci sull’Intracoastal a Palm Beach.",
      "Trechos rápidos no Intracoastal em Palm Beach.",
    ),
  },
  {
    id: "hollywood-34",
    name: "Hollywood 34",
    class: "Deck boat",
    lengthFt: 34,
    guests: 8,
    hoursMin: 3,
    marina: "Hollywood Marina",
    marinaId: "hollywood-marina",
    image: "/fleet/sandbar.jpg",
    lat: 26.0114,
    lng: -80.1238,
    etaMin: 10,
    traits: ["small"],
    captain: {
      name: "Captain Emily Rossi",
      license: "USCG OUPV Six-Pack",
      rating: 4.89,
      trips: 305,
      photo: "/crew/emily.jpg",
      verified: true,
    },
    blurb: blurb(
      "Family sandbar boat. Hollywood Beach in an afternoon.",
      "Bote familiar de sandbar. Hollywood Beach en una tarde.",
      "Bateau familial pour sandbar. Hollywood Beach en un après-midi.",
      "Barca famigliare da sandbar. Hollywood Beach in un pomeriggio.",
      "Barco familiar de sandbar. Hollywood Beach numa tarde.",
    ),
  },
  {
    id: "coral-58",
    name: "Coral 58",
    class: "Flybridge yacht",
    lengthFt: 58,
    guests: 12,
    hoursMin: 4,
    marina: "Dinner Key Marina",
    marinaId: "dinner-key",
    image: "/fleet/miami-skyline.jpg",
    lat: 25.7274,
    lng: -80.2347,
    etaMin: 12,
    traits: ["luxurious", "fast"],
    captain: {
      name: "Captain Luca Bianchi",
      license: "USCG Master 100 Ton",
      rating: 4.97,
      trips: 142,
      photo: "/crew/captain.jpg",
      verified: true,
    },
    blurb: blurb(
      "Grove luxury with pace. Bay cruises that still beat the car.",
      "Lujo en The Grove, con ritmo. Cruceros que aún le ganan al auto.",
      "Luxe à The Grove, avec rythme. Des croisières plus rapides que la voiture.",
      "Lusso a The Grove, con ritmo. Crociere più veloci dell’auto.",
      "Luxo em The Grove, com ritmo. Cruzeiros que ainda ganham do carro.",
    ),
  },
];

export const marinas = [
  "Miami Beach Marina",
  "Island Gardens Miami",
  "Las Olas Marina",
  "Hollywood Marina",
  "Palm Beach Town Docks",
  "Dinner Key Marina",
  "Haulover Park Marina",
  "Port Everglades",
  "PortMiami",
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
