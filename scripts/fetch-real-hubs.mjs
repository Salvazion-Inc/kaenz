/**
 * Pull real yacht marinas/ports from OpenStreetMap (Overpass).
 * Florida + Mediterranean only. Named features only.
 */
import fs from "node:fs";
import path from "node:path";

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const COUNTRY_NAME = {
  "US-FL": "United States",
  ES: "Spain",
  FR: "France",
  IT: "Italy",
  GR: "Greece",
  HR: "Croatia",
  TR: "Turkey",
  MT: "Malta",
  CY: "Cyprus",
  MC: "Monaco",
  MA: "Morocco",
  TN: "Tunisia",
  DZ: "Algeria",
  EG: "Egypt",
  IL: "Israel",
  LB: "Lebanon",
  ME: "Montenegro",
  AL: "Albania",
  SI: "Slovenia",
  BA: "Bosnia and Herzegovina",
  GI: "Gibraltar",
  LY: "Libya",
  PT: "Portugal",
};

const QUERIES = [
  {
    key: "US-FL",
    q: `[out:json][timeout:90];
area["ISO3166-2"="US-FL"]->.a;
(nwr["leisure"="marina"](area.a); nwr["harbour"="marina"](area.a););
out center tags;`,
  },
  ...[
    "ES",
    "FR",
    "IT",
    "GR",
    "HR",
    "TR",
    "MT",
    "CY",
    "MC",
    "MA",
    "TN",
    "DZ",
    "EG",
    "IL",
    "LB",
    "ME",
    "AL",
    "SI",
    "BA",
    "GI",
    "LY",
    "PT",
  ].map((iso) => ({
    key: iso,
    q: `[out:json][timeout:90];
area["ISO3166-1"="${iso}"]->.a;
(nwr["leisure"="marina"](area.a); nwr["harbour"="marina"](area.a););
out center tags;`,
  })),
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function overpass(query) {
  let last;
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!res.ok) {
        last = new Error(`${url} ${res.status}`);
        continue;
      }
      return await res.json();
    } catch (err) {
      last = err;
    }
  }
  throw last || new Error("overpass failed");
}

function centerOf(el) {
  if (el.lat != null && el.lon != null) return { lat: +el.lat, lng: +el.lon };
  if (el.center?.lat != null) return { lat: +el.center.lat, lng: +el.center.lon };
  return null;
}

function slugify(s) {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function kindOf(tags) {
  const n = `${tags.name || ""} ${tags["name:en"] || ""}`.toLowerCase();
  if (tags.leisure === "marina" || tags.harbour === "marina") return "marina";
  if (
    tags.harbour === "port" ||
    tags.industrial === "port" ||
    /\bport of\b/.test(n) ||
    /^port\b/.test(n)
  )
    return "port";
  return "marina";
}

function cityOf(tags, fallback) {
  return (
    tags["addr:city"] ||
    tags["addr:town"] ||
    tags["addr:village"] ||
    tags["addr:suburb"] ||
    tags["is_in:city"] ||
    tags["is_in"]?.split(",")[0]?.trim() ||
    fallback
  );
}

const outDir = "scripts/.hub-cache";
fs.mkdirSync(outDir, { recursive: true });

const all = [];
for (const { key, q } of QUERIES) {
  const cache = path.join(outDir, `${key}.json`);
  let data;
  if (fs.existsSync(cache)) {
    data = JSON.parse(fs.readFileSync(cache, "utf8"));
    console.error(`cache ${key} ${data.elements?.length || 0}`);
  } else {
    process.stderr.write(`fetch ${key}...\n`);
    try {
      data = await overpass(q);
      fs.writeFileSync(cache, JSON.stringify(data));
      console.error(`ok ${key} ${data.elements?.length || 0}`);
    } catch (err) {
      console.error(`fail ${key}`, err.message || err);
      await sleep(4000);
      continue;
    }
    await sleep(1500);
  }
  const country = COUNTRY_NAME[key];
  for (const el of data.elements || []) {
    const tags = el.tags || {};
    const name = (tags["name:en"] || tags.name || "").trim();
    if (!name) continue;
    if (/^(yes|marina|port|harbour|harbor)$/i.test(name)) continue;
    const c = centerOf(el);
    if (!c) continue;
    // Portugal: keep Algarve / south Atlantic-Med fringe and Lisbon for yachts,
    // but skip north/west if far from Med. User asked Med + Florida.
    // Keep Portuguese south coast (Algarve) as yacht market adjacent to Med.
    if (key === "PT" && c.lat > 38.8) continue;
    // France: skip Atlantic (keep Med + Corsica). Rough: lng > 2 or Corsica.
    if (key === "FR" && c.lng < 3 && c.lat > 43.2 && c.lat < 51) continue;
    // Spain: skip Atlantic Galicia/Bay of Biscay; keep Med + Balearics + Ceuta/Melilla + Gibraltar area + Canaries? User said Med. Skip north Atlantic and Canaries.
    if (key === "ES" && c.lng < -6 && c.lat > 36.5) continue;
    if (key === "ES" && c.lat < 27.8) continue; // Canaries
    // Turkey: keep Aegean/Med (lng < 36.5, lat < 42)
    if (key === "TR" && (c.lat > 41.6 || c.lng > 37)) continue;
    // Morocco: Med coast (north) only
    if (key === "MA" && c.lat < 34.5) continue;
    all.push({
      osm: `${el.type}/${el.id}`,
      name,
      city: cityOf(tags, country),
      country,
      lat: +c.lat.toFixed(5),
      lng: +c.lng.toFixed(5),
      kind: kindOf(tags),
    });
  }
}

fs.writeFileSync("scripts/.hub-cache/all.json", JSON.stringify(all, null, 2));
console.log(`raw named ${all.length}`);
