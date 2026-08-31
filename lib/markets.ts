import type { Place } from "./places";

/** Mid-market private yacht hourly (USD) for a standard ~40–45 ft charter. */
export const DEFAULT_MARKET_HOURLY = 380;

const CITY_HOURLY: Record<string, number> = {
  miami: 430,
  "miami beach": 450,
  brickell: 450,
  "watson island": 440,
  "coconut grove": 420,
  "coral gables": 420,
  "key biscayne": 460,
  hollywood: 400,
  "fort lauderdale": 440,
  "dania beach": 400,
  aventura: 430,
  "north miami beach": 410,
  "palm beach": 520,
  "key largo": 470,
  marathon: 450,
  "key west": 480,
  naples: 430,
  "marco island": 430,
  sarasota: 390,
  "st. petersburg": 380,
  tampa: 370,
  destin: 390,
  pensacola: 350,
  jacksonville: 360,
  "cape canaveral": 380,
  "new york": 760,
  montauk: 820,
  "sag harbor": 840,
  newport: 680,
  annapolis: 480,
  baltimore: 420,
  charleston: 450,
  savannah: 400,
  norfolk: 380,
  boston: 560,
  portland: 420,
  "los angeles": 540,
  "marina del rey": 560,
  "san diego": 520,
  "newport beach": 580,
  "long beach": 500,
  "san francisco": 560,
  sausalito: 540,
  seattle: 420,
  honolulu: 580,
  galveston: 340,
  "new orleans": 360,
  chicago: 430,
  detroit: 340,
  houston: 360,
  oakland: 500,
  nassau: 500,
  "paradise island": 540,
  "harbour island": 560,
  "george town": 480,
  "cockburn town": 470,
  "oranjestad": 430,
  willemstad: 430,
  philipsburg: 620,
  marigot: 640,
  "gustavia": 980,
  "st. john's": 500,
  castries: 480,
  bridgetown: 490,
  "fort-de-france": 500,
  "pointe-à-pitre": 500,
  "saint george's": 470,
  "port of spain": 360,
  "punta cana": 400,
  "santo domingo": 360,
  "san juan": 430,
  "montego bay": 390,
  "george town cayman": 620,
  "cancún": 340,
  cancun: 340,
  "playa del carmen": 350,
  "cabo san lucas": 420,
  "puerto vallarta": 330,
  panama: 320,
  monaco: 920,
  "monte carlo": 920,
  cannes: 820,
  nice: 780,
  "saint-tropez": 880,
  antibes: 800,
  marseille: 620,
  barcelona: 640,
  palma: 700,
  ibiza: 860,
  valencia: 560,
  genoa: 640,
  portofino: 900,
  capri: 860,
  sorrento: 780,
  amalfi: 800,
  napoli: 620,
  venice: 700,
  split: 560,
  dubrovnik: 620,
  athens: 540,
  mykonos: 780,
  santorini: 760,
  istanbul: 480,
  dubai: 740,
  "abu dhabi": 680,
  london: 620,
  southampton: 540,
  sydney: 540,
  "rio de janeiro": 300,
  "buenos aires": 280,
  lisbon: 480,
  porto: 420,
  amsterdam: 520,
  hamburg: 480,
  copenhagen: 540,
  oslo: 560,
  stockholm: 540,
  helsinki: 500,
  singapore: 620,
  "hong kong": 600,
  tokyo: 640,
  auckland: 500,
  "cape town": 360,
};

const COUNTRY_HOURLY: Record<string, number> = {
  "united states": 400,
  canada: 420,
  france: 760,
  italy: 740,
  spain: 620,
  monaco: 920,
  croatia: 560,
  greece: 600,
  portugal: 460,
  "united kingdom": 580,
  "united arab emirates": 720,
  bahamas: 500,
  "saint barthélemy": 980,
  "sint maarten": 620,
  "saint martin": 640,
  "british virgin islands": 640,
  "u.s. virgin islands": 560,
  "cayman islands": 620,
  "turks and caicos": 540,
  "puerto rico": 420,
  "dominican republic": 380,
  jamaica: 380,
  mexico: 340,
  brazil: 300,
  argentina: 280,
  australia: 520,
  "new zealand": 500,
  singapore: 620,
  japan: 640,
  "hong kong": 600,
  "south africa": 360,
  bermuda: 640,
  aruba: 430,
  curaçao: 430,
  barbados: 490,
  "antigua and barbuda": 500,
  "saint lucia": 480,
  martinique: 500,
  guadeloupe: 500,
  grenada: 470,
  panama: 320,
  "costa rica": 310,
  belize: 300,
};

function norm(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function marketHourly(place?: Place | null) {
  if (!place) return DEFAULT_MARKET_HOURLY;
  const city = norm(place.city || "");
  if (city && CITY_HOURLY[city]) return CITY_HOURLY[city];
  if (city) {
    for (const [key, rate] of Object.entries(CITY_HOURLY)) {
      if (city.includes(key) || key.includes(city)) return rate;
    }
  }
  const country = norm(place.country || (place.city ? "" : "United States"));
  if (country && COUNTRY_HOURLY[country]) return COUNTRY_HOURLY[country];
  return DEFAULT_MARKET_HOURLY;
}

export function tripMarketHourly(origin?: Place | null, destination?: Place | null) {
  const start = marketHourly(origin);
  const end = destination ? marketHourly(destination) : start;
  return Math.round((start + end) / 2);
}

export function marketLabel(origin?: Place | null, destination?: Place | null) {
  const city = origin?.city || destination?.city || "";
  return city || "Worldwide";
}
