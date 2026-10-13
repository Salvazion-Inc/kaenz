import fs from "node:fs";

const hubs = fs.readFileSync("lib/world-hubs.ts", "utf8");
const extra = fs.readFileSync("scripts/.hub-cache/new-rows.ts.txt", "utf8").trim();
if (hubs.includes("walker-s-coon-key-marina")) {
  console.log("already spliced");
  process.exit(0);
}
const marker = "\n];";
const idx = hubs.lastIndexOf(marker);
if (idx < 0) {
  console.error("no closing ];");
  process.exit(1);
}
const around = JSON.stringify(hubs.slice(idx, idx + 40));
console.log("around", around);
const next = hubs.slice(0, idx) + "\n" + extra + hubs.slice(idx);
fs.writeFileSync("lib/world-hubs.ts", next);
console.log("spliced", extra.split(/\n/).length);
