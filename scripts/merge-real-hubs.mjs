import fs from "node:fs";
import path from "node:path";
import { createReadStream } from "node:fs";
import readline from "node:readline";

const COUNTRY = {
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

function slugify(s) {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 52);
}

function cleanName(name) {
  return name
    .replace(/"/g, "")
    .replace(/\s*[-–—|].*$/, "")
    .replace(/\s*\(.*formerly.*\)/i, "")
    .replace(/,\s*marina$/i, " Marina")
    .replace(/,+\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function keyName(s) {
  return slugify(s).replace(/-(marina|yacht-club|harbour|harbor|port)$/g, "");
}

function near(a, b) {
  return Math.abs(a.lat - b.lat) < 0.0022 && Math.abs(a.lng - b.lng) < 0.0022;
}

function inMed(lat, lng, iso) {
  if (iso === "FR") return lng >= 3 && lat <= 44.1;
  if (iso === "ES") {
    if (lng < -12) return false; // Canaries
    if (lng < -6 && lat > 36.6) return false; // Atlantic Spain
    return lat < 43.8;
  }
  if (iso === "TR") return lat < 40.15 && lng > 25.5 && lng < 32.6;
  if (iso === "MA") return lat > 34.6 && lng > -6.6;
  if (iso === "PT") return false;
  if (iso === "EG") return lng > 28.5 && lat < 32.6;
  if (iso === "IT") return lat < 46.2;
  return true;
}

function yachtName(name) {
  return /marina|yacht|harbor|harbour|yachting|porto|portos|puerto deportivo|port de plaisance|darsena|circolo nautico|yacht club|marina di|limani/i.test(
    name,
  );
}

const existingSrc = fs.readFileSync("lib/world-hubs.ts", "utf8");
const existing = [
  ...existingSrc.matchAll(
    /\[\s*"([^"]+)",\s*"(marina|port)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*([-\d.]+),\s*([-\d.]+)\]/g,
  ),
].map((m) => ({
  id: m[1],
  kind: m[2],
  name: m[3],
  city: m[4],
  country: m[5],
  lat: +m[6],
  lng: +m[7],
}));

const usedIds = new Set(existing.map((r) => r.id));
const usedNames = new Set(existing.map((r) => `${keyName(r.name)}|${r.country}`));
const usedCoords = existing.map((r) => ({ lat: r.lat, lng: r.lng }));

function isDup(row) {
  if (usedIds.has(row.id)) return true;
  if (usedNames.has(`${keyName(row.name)}|${row.country}`)) return true;
  if (usedCoords.some((c) => near(c, row))) return true;
  return false;
}

function take(row) {
  usedIds.add(row.id);
  usedNames.add(`${keyName(row.name)}|${row.country}`);
  usedCoords.push({ lat: row.lat, lng: row.lng });
}

const added = [];

function addRow(row) {
  if (!row.name || row.name.length < 3) return false;
  if (/^(yes|marina|port|harbour|harbor|puerto|porto)$/i.test(row.name))
    return false;
  let id = slugify(row.name);
  if (!id) return false;
  if (usedIds.has(id)) id = `${id}-${slugify(row.city || row.country)}`;
  if (usedIds.has(id)) id = `${id}-${Math.abs(Math.round(row.lat * 1000))}`;
  const next = { ...row, id, lat: +row.lat.toFixed(5), lng: +row.lng.toFixed(5) };
  if (isDup(next)) return false;
  take(next);
  added.push(next);
  return true;
}

function loadFwc(file) {
  if (!fs.existsSync(file)) return [];
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  return j.features || [];
}

const skip =
  /ramp|kayak|canoe|airboat|trailer park|fish camp|\blaunch\b|bait shop|dry storage|condo|association|bar and grill|restaurant|tower|vice city|boating park|ships store/i;
const keep =
  /marina|yacht club|yacht basin|yachting|harbour marina|harbor marina|boat club/i;

for (const file of [
  "scripts/.hub-cache/florida-fwc.geojson",
  "scripts/.hub-cache/florida-fwc-2.geojson",
]) {
  for (const f of loadFwc(file)) {
    const p = f.properties || {};
    const raw = (p.Name || "").trim();
    if (!raw || !keep.test(raw) || skip.test(raw)) continue;
    const name = cleanName(raw);
    const [lng, lat] = f.geometry?.coordinates || [];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    addRow({
      kind: /port of|cruise port/i.test(name) ? "port" : "marina",
      name,
      city: (p.City || p.County || "Florida").trim(),
      country: "United States",
      lat,
      lng,
    });
  }
}

const floridaAdded = added.length;
console.error(`florida new ${floridaAdded}`);

const geoDir = "scripts/.hub-cache/geonames";
const codes = Object.keys(COUNTRY);
for (const iso of codes) {
  const file = path.join(geoDir, `${iso}.txt`);
  if (!fs.existsSync(file)) continue;
  const lines = fs.readFileSync(file, "utf8").split(/\n/);
  for (const line of lines) {
    if (!line) continue;
    const cols = line.split("\t");
    const name = cols[1];
    const lat = +cols[4];
    const lng = +cols[5];
    const fcode = cols[7];
    if (!["MAR", "HBR", "PRT"].includes(fcode)) continue;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (!inMed(lat, lng, iso)) continue;
    if (fcode !== "MAR" && !yachtName(name) && fcode !== "PRT") continue;
    if (/^(malta port|the port|harbour|harbor)$/i.test(name)) continue;
    const marinaLike =
      fcode === "MAR" ||
      yachtName(name) ||
      /puerto deportivo|port de plaisance|marina/i.test(name);
    addRow({
      kind: marinaLike ? "marina" : "port",
      name: cleanName(name),
      city:
        cleanName(name)
          .replace(/^marina di\s+/i, "")
          .replace(/^marina d['’]/i, "")
          .replace(/^port de plaisance (de\s+)?/i, "")
          .replace(/^puerto deportivo (de\s+)?/i, "")
          .replace(/^porto turistico (di\s+)?/i, "")
          .replace(/\s(marina|harbour|harbor|yacht club|port)$/i, "") ||
        COUNTRY[iso],
      country: COUNTRY[iso],
      lat,
      lng,
    });
  }
}

console.error(`after geonames ${added.length} (med ${added.length - floridaAdded})`);

const fl = added.filter((r) => r.country === "United States");
const med = added.filter((r) => r.country !== "United States");
const medByCountry = new Map();
for (const r of med) {
  const list = medByCountry.get(r.country) || [];
  list.push(r);
  medByCountry.set(r.country, list);
}
const medPicked = [];
const queues = [...medByCountry.values()].map((list) => [...list]);
while (medPicked.length < 347 && queues.some((q) => q.length)) {
  for (const q of queues) {
    if (medPicked.length >= 347) break;
    const next = q.shift();
    if (next) medPicked.push(next);
  }
}
const picked = [...fl.slice(0, 360), ...medPicked].slice(0, 707);
console.error(
  `picked ${picked.length} florida ${Math.min(360, fl.length)} med ${medPicked.length}`,
);

const lines = picked.map((r) => {
  const name = r.name.replace(/"/g, "");
  const city = r.city.replace(/"/g, "").replace(/,+\s*$/g, "");
  return `  ["${r.id}", "${r.kind}", "${name}", "${city}", "${r.country}", ${r.lat}, ${r.lng}],`;
});

fs.writeFileSync("scripts/.hub-cache/new-rows.ts.txt", lines.join("\n") + "\n");
fs.writeFileSync(
  "scripts/.hub-cache/new-rows.json",
  JSON.stringify(
    {
      floridaNew: floridaAdded,
      medNew: added.length - floridaAdded,
      picked: picked.length,
      byCountry: picked.reduce((acc, r) => {
        acc[r.country] = (acc[r.country] || 0) + 1;
        return acc;
      }, {}),
    },
    null,
    2,
  ),
);
console.log(fs.readFileSync("scripts/.hub-cache/new-rows.json", "utf8"));
