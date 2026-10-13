import fs from "node:fs";

const t = fs.readFileSync("lib/world-hubs.ts", "utf8");
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
const ids = new Set(rows.map((r) => r.id));
const by = {};
for (const r of rows) by[r.country] = (by[r.country] || 0) + 1;
console.log(
  JSON.stringify(
    {
      rows: rows.length,
      uniqueIds: ids.size,
      countries: Object.keys(by).length,
      byCountry: Object.fromEntries(
        Object.entries(by).sort((a, b) => b[1] - a[1]),
      ),
    },
    null,
    2,
  ),
);
