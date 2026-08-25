import { countryName } from "./countries";
import type { Locale, Localized } from "./locale";
import { worldHubs } from "./world-hubs";

export type PlaceKind = "marina" | "port" | "place";

export type Place = {
  id: string;
  kind: PlaceKind;
  name: string;
  city: string;
  country?: string;
  lat: number;
  lng: number;
  image: string;
  minutesByYacht: number;
  minutesByCar: number;
  blurb: Localized;
};

export function placeCountry(place: Place, locale: Locale = "en") {
  return countryName(place.country || "United States", locale);
}

const southFlorida: Place[] = [
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
      fr: "Emplacement premium pour des sauts skyline vers Brickell et South Beach.",
      it: "Ormeggio principale per salti skyline verso Brickell e South Beach.",
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
      fr: "Marina professionnelle la plus proche de South Beach sur la MacArthur Causeway.",
      it: "La marina professionale più vicina a South Beach sulla MacArthur Causeway.",
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
      fr: "Cœur de la Venise d’Amérique — yachts, Las Olas et la New River.",
      it: "Cuore della Venezia d’America — yacht, Las Olas e il New River.",
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
      fr: "Porte d’entrée du sandbar de Hollywood Beach en environ 35 minutes depuis FTL.",
      it: "Porta al sandbar di Hollywood Beach in circa 35 minuti da FTL.",
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
      fr: "Traversée au coucher du soleil depuis Fort Lauderdale sur l’Intracoastal.",
      it: "Traversata al tramonto da Fort Lauderdale sull’Intracoastal.",
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
      fr: "Classique de Coconut Grove. Croisière facile sur Biscayne Bay.",
      it: "Classico di Coconut Grove. Crociera facile su Biscayne Bay.",
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
      fr: "Accès à l’océan. Évitez les ponts au nord de Miami Beach.",
      it: "Accesso all’oceano. Evita i ponti a nord di Miami Beach.",
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
      fr: "Port en eaux profondes. Récupérez les croisiéristes en yacht, pas en voiture.",
      it: "Porto di acque profonde. Raccogli i crocieristi in yacht, non in auto.",
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
      fr: "Capitale mondiale des croisières. Le transfert par eau bat le trafic du centre.",
      it: "Capitale mondiale delle crociere. Il trasferimento via acqua batte il traffico.",
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
      fr: "Ancrez, nagez, pagayez. Le sandbar familial depuis Fort Lauderdale.",
      it: "Ancora, nuoto e paddle. Il sandbar in famiglia da Fort Lauderdale.",
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
      fr: "Miami Beach à Brickell en 18 minutes. Adieu le trafic.",
      it: "Da Miami Beach a Brickell in 18 minuti. Addio traffico.",
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
      fr: "Croisière lente devant les maisons les plus photographiées de Miami.",
      it: "Crociera lenta davanti alle case più fotografate di Miami.",
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
      fr: "Eaux ouvertes, vues sur le skyline et l’autoroute du futur.",
      it: "Acque aperte, skyline e l’autostrada del futuro.",
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
      fr: "Fort Lauderdale à Palm Beach en 45 minutes à l’heure dorée.",
      it: "Da Fort Lauderdale a Palm Beach in 45 minuti all’ora d’oro.",
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
      fr: "Arrivez par l’eau. Pas de file de voiturier sur Ocean Drive.",
      it: "Arriva via acqua. Niente fila del valet su Ocean Drive.",
    },
  },
];

export const places: Place[] = [...southFlorida, ...worldHubs];

export const mapHubs = places.filter(
  (p) => p.kind === "marina" || p.kind === "port",
);

export function placeById(id: string) {
  return places.find((p) => p.id === id);
}

export function placesByKind(kind: PlaceKind | "all") {
  if (kind === "all") return places;
  return places.filter((p) => p.kind === kind);
}
