import fs from "node:fs";

const t = fs.readFileSync("scripts/.hub-cache/new-rows.ts.txt", "utf8");
const rows = [
  ...t.matchAll(
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
const bad = rows.filter(
  (r) =>
    (r.country === "Spain" && r.lng < -12) ||
    (r.country === "France" && (r.lat > 44.1 || r.lng < 3)) ||
    (r.country === "Turkey" && r.lat > 40.2) ||
    (r.country === "United States" &&
      (r.lat < 24.3 || r.lat > 31.2 || r.lng > -79.8 || r.lng < -87.7)),
);
console.log("rows", rows.length, "bad", bad.length);
if (bad[0]) console.log(bad.slice(0, 8));
console.log(
  "sample med",
  rows
    .filter((r) => r.country !== "United States")
    .slice(0, 15)
    .map((r) => `${r.name} | ${r.city} | ${r.country}`),
);
console.log(
  "sample fl",
  rows
    .filter((r) => r.country === "United States")
    .slice(0, 10)
    .map((r) => `${r.name} | ${r.city}`),
);
