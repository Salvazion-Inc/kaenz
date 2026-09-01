import { countryName } from "./countries";
import { featuredPlaces, type FeaturedKind } from "./featured-places";
import type { Locale, Localized } from "./locale";
import { worldHubs } from "./world-hubs";

export type PlaceKind = "marina" | "port" | "place";
export type { FeaturedKind };

export type Place = {
  id: string;
  kind: PlaceKind;
  featured?: FeaturedKind;
  name: string;
  city: string;
  country?: string;
  lat: number;
  lng: number;
  image: string;
  minutesByYacht: number;
  minutesByCar: number;
  blurb: Localized;
  partner?: boolean;
  address?: string;
  region?: string;
  dockmaster?: string;
  phone?: string;
  website?: string;
  popular?: boolean;
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
    image: "/featured/scenic-miami-beach-marina.jpg",
    minutesByYacht: 18,
    minutesByCar: 45,
    blurb: {
      en: "Prime slip for skyline hops to Brickell and South Beach.",
      es: "Muelle principal para saltos al skyline de Brickell y South Beach.",
      fr: "Emplacement premium pour des sauts skyline vers Brickell et South Beach.",
      it: "Ormeggio principale per salti skyline verso Brickell e South Beach.",
      pt: "Vaga principal para saltos de skyline até Brickell e South Beach.",
    },
  },
  {
    id: "island-gardens",
    kind: "marina",
    name: "Island Gardens Miami",
    city: "Watson Island",
    lat: 25.7851,
    lng: -80.1774,
    image: "/featured/scenic-island-gardens.jpg",
    minutesByYacht: 12,
    minutesByCar: 28,
    blurb: {
      en: "Closest professional marina to South Beach on the MacArthur Causeway.",
      es: "La marina profesional más cercana a South Beach en la calzada MacArthur.",
      fr: "Marina professionnelle la plus proche de South Beach sur la MacArthur Causeway.",
      it: "La marina professionale più vicina a South Beach sulla MacArthur Causeway.",
      pt: "A marina profissional mais próxima de South Beach na MacArthur Causeway.",
    },
  },
  {
    id: "las-olas-marina",
    kind: "marina",
    name: "Las Olas Marina",
    city: "Fort Lauderdale",
    lat: 26.1192,
    lng: -80.108,
    image: "/featured/ocean-prime.jpg",
    minutesByYacht: 22,
    minutesByCar: 55,
    blurb: {
      en: "Heart of the Venice of America — yachts, Las Olas, and the New River.",
      es: "Corazón de la Venecia de América — yates, Las Olas y el New River.",
      fr: "Cœur de la Venise d’Amérique — yachts, Las Olas et la New River.",
      it: "Cuore della Venezia d’America — yacht, Las Olas e il New River.",
      pt: "Coração da Veneza da América — iates, Las Olas e o New River.",
    },
  },
  {
    id: "hollywood-marina",
    kind: "marina",
    name: "Hollywood Marina",
    city: "Hollywood",
    lat: 26.0114,
    lng: -80.1238,
    image: "/featured/hollywood-broadwalk.jpg",
    minutesByYacht: 15,
    minutesByCar: 40,
    blurb: {
      en: "Gateway to the Hollywood Beach sandbar in about 35 minutes from FTL.",
      es: "Puerta al sandbar de Hollywood Beach en unos 35 minutos desde FTL.",
      fr: "Porte d’entrée du sandbar de Hollywood Beach en environ 35 minutes depuis FTL.",
      it: "Porta al sandbar di Hollywood Beach in circa 35 minuti da FTL.",
      pt: "Porta para o sandbar de Hollywood Beach em cerca de 35 minutos a partir de FTL.",
    },
  },
  {
    id: "palm-beach-docks",
    kind: "port",
    name: "Palm Beach Town Docks",
    city: "Palm Beach",
    lat: 26.7056,
    lng: -80.0364,
    image: "/featured/palm-beach-estates.jpg",
    minutesByYacht: 45,
    minutesByCar: 90,
    blurb: {
      en: "Sunset run from Fort Lauderdale — romance on the Intracoastal.",
      es: "Travesía al atardecer desde Fort Lauderdale por el Intracoastal.",
      fr: "Traversée au coucher du soleil depuis Fort Lauderdale sur l’Intracoastal.",
      it: "Traversata al tramonto da Fort Lauderdale sull’Intracoastal.",
      pt: "Travessia ao pôr do sol desde Fort Lauderdale no Intracoastal.",
    },
  },
  {
    id: "dinner-key",
    kind: "marina",
    name: "Dinner Key Marina",
    city: "Coconut Grove",
    lat: 25.7274,
    lng: -80.2347,
    image: "/featured/montys.jpg",
    minutesByYacht: 20,
    minutesByCar: 38,
    blurb: {
      en: "Coconut Grove classic. Easy Biscayne Bay cruising.",
      es: "Clásico de Coconut Grove. Crucero fácil por Biscayne Bay.",
      fr: "Classique de Coconut Grove. Croisière facile sur Biscayne Bay.",
      it: "Classico di Coconut Grove. Crociera facile su Biscayne Bay.",
      pt: "Clássico de Coconut Grove. Cruzeiro fácil na Biscayne Bay.",
    },
  },
  {
    id: "haulover",
    kind: "marina",
    name: "Haulover Park Marina",
    city: "North Miami Beach",
    lat: 25.9029,
    lng: -80.1231,
    image: "/featured/haulover-sandbar.jpg",
    minutesByYacht: 16,
    minutesByCar: 35,
    blurb: {
      en: "Ocean inlet access. Skip the bridges north of Miami Beach.",
      es: "Acceso al océano. Evita los puentes al norte de Miami Beach.",
      fr: "Accès à l’océan. Évitez les ponts au nord de Miami Beach.",
      it: "Accesso all’oceano. Evita i ponti a nord di Miami Beach.",
      pt: "Acesso ao oceano. Evite as pontes ao norte de Miami Beach.",
    },
  },
  {
    id: "port-everglades",
    kind: "port",
    name: "Port Everglades",
    city: "Fort Lauderdale",
    lat: 26.094,
    lng: -80.115,
    image: "/featured/port-everglades-inlet.jpg",
    minutesByYacht: 10,
    minutesByCar: 30,
    blurb: {
      en: "Deep-water port. Meet cruise guests by yacht instead of by car.",
      es: "Puerto de aguas profundas. Recoge a cruceristas en yate, no en auto.",
      fr: "Port en eaux profondes. Récupérez les croisiéristes en yacht, pas en voiture.",
      it: "Porto di acque profonde. Raccogli i crocieristi in yacht, non in auto.",
      pt: "Porto de águas profundas. Busque passageiros de cruzeiro de iate, não de carro.",
    },
  },
  {
    id: "port-miami",
    kind: "port",
    name: "PortMiami",
    city: "Miami",
    lat: 25.778,
    lng: -80.177,
    image: "/featured/downtown-bayside.jpg",
    minutesByYacht: 8,
    minutesByCar: 32,
    blurb: {
      en: "Cruise capital of the world. Water transfer beats downtown traffic.",
      es: "Capital mundial de cruceros. El traslado por agua gana al tráfico.",
      fr: "Capitale mondiale des croisières. Le transfert par eau bat le trafic du centre.",
      it: "Capitale mondiale delle crociere. Il trasferimento via acqua batte il traffico.",
      pt: "Capital mundial dos cruzeiros. O traslado pela água ganha do trânsito.",
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
      pt: "De Miami Beach a Brickell em 18 minutos. Adeus trânsito.",
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
      pt: "Águas abertas, skyline e a autoestrada do futuro.",
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
      pt: "De Fort Lauderdale a Palm Beach em 45 minutos na hora dourada.",
    },
  },
];

export const places: Place[] = [...southFlorida, ...featuredPlaces, ...worldHubs];

export const mapHubs = places.filter(
  (p) => p.kind === "marina" || p.kind === "port" || Boolean(p.featured),
);

export function placeById(id: string) {
  return places.find((p) => p.id === id);
}

export function placesByKind(kind: PlaceKind | "all") {
  if (kind === "all") return places;
  return places.filter((p) => p.kind === kind);
}
