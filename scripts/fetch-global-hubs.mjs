/**
 * Worldwide marinas, harbors, and ports from the daily GeoNames gazetteer
 * (CC-BY). Skips places already on the Kaenz map.
 *
 * MarineTraffic does not publish a redistributable port export. GeoNames
 * feature codes MAR (marina), PRT (port), and HBR (harbor) are the public
 * record of where a yacht can board and land passengers.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const cacheDir = "scripts/.hub-cache/global";
fs.mkdirSync(cacheDir, { recursive: true });

const ZIP_URL = "https://download.geonames.org/export/dump/allCountries.zip";
const ADMIN_URL = "https://download.geonames.org/export/dump/admin1CodesASCII.txt";
const KEEP = new Set(["MAR", "PRT", "HBR"]);

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

const ISO_OVERRIDE = {
  US: "United States",
  GB: "United Kingdom",
  VI: "U.S. Virgin Islands",
  VG: "British Virgin Islands",
  TR: "Turkey",
  KR: "South Korea",
  KP: "North Korea",
  CZ: "Czechia",
  MK: "North Macedonia",
  CI: "Côte d'Ivoire",
  CD: "Democratic Republic of the Congo",
  CG: "Republic of the Congo",
  TZ: "Tanzania",
  VN: "Vietnam",
  LA: "Laos",
  SY: "Syria",
  RU: "Russia",
  IR: "Iran",
  BO: "Bolivia",
  VE: "Venezuela",
  BN: "Brunei",
  FM: "Micronesia",
  MD: "Moldova",
  PS: "Palestine",
  TW: "Taiwan",
  HK: "Hong Kong",
  MO: "Macao",
  BL: "Saint Barthélemy",
  MF: "Saint Martin",
  SX: "Sint Maarten",
  CW: "Curaçao",
  BQ: "Bonaire",
  TC: "Turks and Caicos",
  KY: "Cayman Islands",
  AG: "Antigua and Barbuda",
  TT: "Trinidad and Tobago",
  DO: "Dominican Republic",
  BS: "Bahamas",
  GM: "Gambia",
  NL: "Netherlands",
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
  ZA: "South Africa",
  NZ: "New Zealand",
  PG: "Papua New Guinea",
  SB: "Solomon Islands",
  ST: "São Tomé and Príncipe",
  CV: "Cabo Verde",
  TL: "Timor-Leste",
  SZ: "Eswatini",
  BA: "Bosnia and Herzegovina",
  CF: "Central African Republic",
  GQ: "Equatorial Guinea",
  GW: "Guinea-Bissau",
  KN: "Saint Kitts and Nevis",
  LC: "Saint Lucia",
  VC: "Saint Vincent and the Grenadines",
  PF: "French Polynesia",
  NC: "New Caledonia",
  RE: "Réunion",
  YT: "Mayotte",
  GP: "Guadeloupe",
  MQ: "Martinique",
  GF: "French Guiana",
  AS: "American Samoa",
  GU: "Guam",
  MP: "Northern Mariana Islands",
  PR: "Puerto Rico",
  AX: "Åland Islands",
};

function countryFromIso(iso) {
  const code = String(iso || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "";
  if (ISO_OVERRIDE[code]) return ISO_OVERRIDE[code];
  try {
    const name = regionNames.of(code);
    if (name && name !== code) return name;
  } catch {
    /* ignore */
  }
  return "";
}

function slugify(s) {
  return String(s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 52);
}

function keyName(s) {
  return slugify(s)
    .replace(
      /-(marina|yacht-club|harbour|harbor|port|yacht-harbour|yacht-harbor|yacht)$/g,
      "",
    )
    .replace(/^(marina|port|harbour|harbor|puerto|porto|port-of)-/, "");
}

function cleanName(name) {
  return String(name || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["']+|["']+$/g, "");
}

const skipName =
  /^(yes|marina|port|harbour|harbor|puerto|porto|the marina|the port|yacht club|bay|island|point|cape)$/i;
const skipFacility =
  /oil terminal|petroleum|lng terminal|gas terminal|coal terminal|container terminal|refinery|shipyard|dry ?dock|naval base|navy base|military base|ammunition/i;

function cityOf(name, adminName, country) {
  const stripped = cleanName(name)
    .replace(/^marina di\s+/i, "")
    .replace(/^marina d['’]\s*/i, "")
    .replace(/^port de plaisance (de\s+|d['’]\s*)?/i, "")
    .replace(/^puerto deportivo (de\s+)?/i, "")
    .replace(/^porto turistico (di\s+)?/i, "")
    .replace(/^yacht club (de\s+|of\s+)?/i, "")
    .replace(/^port of\s+/i, "")
    .replace(/\s+(marina|harbour|harbor|yacht club|port)$/i, "")
    .trim();
  if (
    stripped &&
    stripped.length > 2 &&
    stripped.length < 48 &&
    !/^(marina|port|harbour|harbor|municipal|city|town|yacht|club|the)$/i.test(
      stripped,
    )
  ) {
    return stripped;
  }
  if (adminName) return adminName;
  return country;
}

function kindOf(code, name) {
  if (code === "MAR" || /marina|yacht/i.test(name)) return "marina";
  return "port";
}

function cellKey(lat, lng) {
  return `${Math.round(lat * 400)}:${Math.round(lng * 400)}`;
}

function near(a, b, deg) {
  return Math.abs(a.lat - b.lat) < deg && Math.abs(a.lng - b.lng) < deg;
}

function loadExisting() {
  const rows = [];
  const hubs = fs.readFileSync("lib/world-hubs.ts", "utf8");
  for (const m of hubs.matchAll(
    /\[\s*"([^"]+)",\s*"(marina|port)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*([-\d.]+),\s*([-\d.]+)\]/g,
  )) {
    rows.push({
      id: m[1],
      name: m[3],
      country: m[5],
      lat: +m[6],
      lng: +m[7],
    });
  }
  const places = fs.readFileSync("lib/places.ts", "utf8");
  const re =
    /id:\s*"([^"]+)"[\s\S]*?kind:\s*"(marina|port|place)"[\s\S]*?name:\s*"([^"]+)"[\s\S]*?city:\s*"([^"]+)"([\s\S]*?)lat:\s*([-\d.]+)[\s\S]*?lng:\s*([-\d.]+)/g;
  for (const m of places.matchAll(re)) {
    if (m[2] === "place") continue;
    const country = (m[5].match(/country:\s*"([^"]+)"/) || [])[1] || "United States";
    rows.push({
      id: m[1],
      name: m[3],
      country,
      lat: +m[6],
      lng: +m[7],
    });
  }
  return rows;
}

function buildIndex(existing) {
  const usedIds = new Set();
  const byName = new Map();
  const grid = new Map();
  for (const row of existing) {
    usedIds.add(row.id);
    remember(byName, grid, row);
  }
  return { usedIds, byName, grid };
}

function remember(byName, grid, row) {
  const key = keyName(row.name);
  if (key.length >= 4) {
    const list = byName.get(key) || [];
    list.push(row);
    byName.set(key, list);
  }
  const ck = cellKey(row.lat, row.lng);
  const bucket = grid.get(ck) || [];
  bucket.push(row);
  grid.set(ck, bucket);
}

function nameOverlaps(a, b) {
  const left = keyName(a);
  const right = keyName(b);
  if (left.length < 8 || right.length < 8) return false;
  return left.includes(right) || right.includes(left);
}

function isDup(index, row) {
  if (index.usedIds.has(row.id)) return true;
  const key = keyName(row.name);
  if (key.length >= 4) {
    const named = index.byName.get(key);
    if (named?.some((item) => near(item, row, 0.028))) return true;
  }
  const latCell = Math.round(row.lat * 400);
  const lngCell = Math.round(row.lng * 400);
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const bucket = index.grid.get(`${latCell + dy}:${lngCell + dx}`);
      if (!bucket) continue;
      for (const item of bucket) {
        if (near(item, row, 0.0024)) return true;
        if (nameOverlaps(item.name, row.name) && near(item, row, 0.008)) {
          return true;
        }
      }
    }
  }
  return false;
}

async function download(url, file, minBytes = 1000) {
  if (fs.existsSync(file) && fs.statSync(file).size >= minBytes) {
    process.stderr.write(`cache ${path.basename(file)}\n`);
    return;
  }
  process.stderr.write(`download ${url}\n`);
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`${url} ${res.status}`);
  const out = fs.createWriteStream(file);
  let got = 0;
  for await (const chunk of res.body) {
    const buf = Buffer.from(chunk);
    got += buf.length;
    if (!out.write(buf)) {
      await new Promise((resolve) => out.once("drain", resolve));
    }
    if (got % (40 * 1024 * 1024) < buf.length) {
      process.stderr.write(`  ${Math.round(got / 1e6)} MB\n`);
    }
  }
  await new Promise((resolve, reject) => {
    out.end(() => resolve());
    out.on("error", reject);
  });
  process.stderr.write(`saved ${path.basename(file)} ${Math.round(got / 1e6)} MB\n`);
}

function loadAdmin() {
  const file = path.join(cacheDir, "admin1CodesASCII.txt");
  const map = new Map();
  if (!fs.existsSync(file)) return map;
  for (const line of fs.readFileSync(file, "utf8").split(/\n/)) {
    if (!line || line.startsWith("#")) continue;
    const [code, name] = line.split("\t");
    if (code && name) map.set(code, name);
  }
  return map;
}

function streamZip(zipPath) {
  const child = spawn("tar", ["-xOf", zipPath, "allCountries.txt"], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let err = "";
  child.stderr.on("data", (buf) => {
    err += buf.toString();
  });
  child.on("exit", (code) => {
    if (code && code !== 0) {
      child.stdout.destroy(new Error(err.slice(0, 300) || `tar ${code}`));
    }
  });
  return child.stdout;
}

async function main() {
  const zipPath = path.join(cacheDir, "allCountries.zip");
  await download(ADMIN_URL, path.join(cacheDir, "admin1CodesASCII.txt"));
  await download(ZIP_URL, zipPath, 300 * 1024 * 1024);

  const admin = loadAdmin();
  const existing = loadExisting();
  process.stderr.write(`existing hubs ${existing.length}\n`);
  const index = buildIndex(existing);
  const added = [];
  let seen = 0;
  let kept = 0;

  const lines = readline.createInterface({
    input: streamZip(zipPath),
    crlfDelay: Infinity,
  });

  for await (const line of lines) {
    seen++;
    if (seen % 2000000 === 0) {
      process.stderr.write(`scanned ${seen} kept ${added.length}\n`);
    }
    if (!line) continue;
    const cols = line.split("\t");
    const code = cols[7];
    if (!KEEP.has(code)) continue;
    kept++;
    const name = cleanName(cols[1] || cols[2]);
    if (!name || name.length < 3 || name.length > 90) continue;
    if (skipName.test(name) || skipFacility.test(name)) continue;
    const lat = +cols[4];
    const lng = +cols[5];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (Math.abs(lat) < 0.01 && Math.abs(lng) < 0.01) continue;
    if (lat < -60 || lat > 78) continue;
    const country = countryFromIso(cols[8]);
    if (!country) continue;
    const adminName = admin.get(`${cols[8]}.${cols[10]}`) || "";
    let id = slugify(name);
    if (!id || id.length < 3) continue;
    if (index.usedIds.has(id)) id = `${id}-${slugify(country)}`.slice(0, 64);
    if (index.usedIds.has(id)) id = `${id}-${Math.abs(Math.round(lat * 100))}`;
    const row = {
      id,
      kind: kindOf(code, name),
      name,
      city: cityOf(name, adminName, country),
      country,
      lat: +lat.toFixed(5),
      lng: +lng.toFixed(5),
    };
    if (isDup(index, row)) continue;
    index.usedIds.add(row.id);
    remember(index.byName, index.grid, row);
    added.push(row);
  }

  if (added.length < 1000) {
    throw new Error(`only ${added.length} hubs parsed; gazetteer stream failed`);
  }

  added.sort(
    (a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name),
  );
  const byCountry = {};
  for (const row of added) byCountry[row.country] = (byCountry[row.country] || 0) + 1;
  const linesOut = added.map(
    (row) =>
      `  [${JSON.stringify(row.id)}, ${JSON.stringify(row.kind)}, ${JSON.stringify(row.name)}, ${JSON.stringify(row.city)}, ${JSON.stringify(row.country)}, ${row.lat}, ${row.lng}],`,
  );

  const out = `import { countryName } from "./countries";
import { aerialPhotoUrl } from "./place-photo";
import type { Localized } from "./locale";
import type { Place } from "./places";

type HubRow = [
  id: string,
  kind: "marina" | "port",
  name: string,
  city: string,
  country: string,
  lat: number,
  lng: number,
];

/** Marinas, harbors, and ports from the GeoNames daily gazetteer (CC-BY). Deduped against curated Kaenz hubs. */
const rows: HubRow[] = [
${linesOut.join("\n")}
];

function blurbFor(
  kind: "marina" | "port",
  name: string,
  city: string,
  country: string,
): Localized {
  const enC = countryName(country, "en");
  const esC = countryName(country, "es");
  const frC = countryName(country, "fr");
  const itC = countryName(country, "it");
  const ptC = countryName(country, "pt");
  if (kind === "port") {
    return {
      en: \`\${name} is the port of \${city}, \${enC}. Yacht arrivals and departures at these coordinates.\`,
      es: \`\${name} es el puerto de \${city}, \${esC}. Llegadas y salidas en yate en estas coordenadas.\`,
      fr: \`\${name} est le port de \${city}, \${frC}. Arrivées et départs en yacht à ces coordonnées.\`,
      it: \`\${name} è il porto di \${city}, \${itC}. Arrivi e partenze in yacht a queste coordinate.\`,
      pt: \`\${name} é o porto de \${city}, \${ptC}. Chegadas e partidas de iate nestas coordenadas.\`,
    };
  }
  return {
    en: \`\${name} is a marina in \${city}, \${enC}. Yacht pickup and dropoff at this harbor.\`,
    es: \`\${name} es una marina en \${city}, \${esC}. Origen y destino en yate en este puerto.\`,
    fr: \`\${name} est une marina à \${city}, \${frC}. Départ et arrivée en yacht dans ce port.\`,
    it: \`\${name} è una marina a \${city}, \${itC}. Partenza e arrivo in yacht in questo porto.\`,
    pt: \`\${name} é uma marina em \${city}, \${ptC}. Partida e chegada de iate neste porto.\`,
  };
}

export const globalHubs: Place[] = rows.map((row) => {
  const [id, kind, name, city, country, lat, lng] = row;
  let blurb: Localized | undefined;
  let image: string | undefined;
  return {
    id,
    kind,
    name,
    city,
    country,
    lat,
    lng,
    get image() {
      image ??= aerialPhotoUrl(lat, lng);
      return image;
    },
    minutesByYacht: 20,
    minutesByCar: 0,
    get blurb() {
      blurb ??= blurbFor(kind, name, city, country);
      return blurb;
    },
  };
});
`;

  fs.writeFileSync("lib/global-hubs.ts", out);
  const summary = {
    scanned: seen,
    featureRows: kept,
    added: added.length,
    marinas: added.filter((row) => row.kind === "marina").length,
    ports: added.filter((row) => row.kind === "port").length,
    countries: Object.keys(byCountry).length,
  };
  fs.writeFileSync(path.join(cacheDir, "summary.json"), JSON.stringify({ ...summary, byCountry }, null, 2));
  console.log(JSON.stringify(summary));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
