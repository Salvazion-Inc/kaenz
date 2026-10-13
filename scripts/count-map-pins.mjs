import fs from "node:fs";

function idsFrom(file, re) {
  return [...fs.readFileSync(file, "utf8").matchAll(re)].map((m) => m[1]);
}

const hubIds = idsFrom(
  "lib/world-hubs.ts",
  /\[\s*"([^"]+)",\s*"(marina|port)"/g,
);
const sf = [
  ...fs.readFileSync("lib/places.ts", "utf8").matchAll(/id: "([^"]+)"[\s\S]*?kind: "(marina|port)"/g),
].map((m) => m[1]);
const set = new Set([...hubIds, ...sf]);
console.log({
  worldHubs: hubIds.length,
  southFloridaMarinaPort: sf.length,
  uniqueMapPins: set.size,
});
