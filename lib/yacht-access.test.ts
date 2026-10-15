import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { confirmationSignal, signalAllowsSubmit } from "./account-verification";
import { loginUrl, safeNextPath, sessionGateNext } from "./form-gate";
import {
  LISTING_MAX_BYTES,
  parseStoredListingBody,
  rawListingFileTooBig,
} from "./listing-files";
import { readAccountAccess } from "./submit-access";
import {
  canManageListing,
  filesInListingFolder,
  isPublicListingStatus,
  listingStorageTargets,
} from "./yacht-owner";

const LISTING_ID = "6f1e5c2a-9b34-4d70-8a11-0c2d4e6f8a90";
const USER_ID = "google:barcelona-partner";

test("anonymous yacht, marina, and request screens go to login before the form", () => {
  assert.equal(sessionGateNext("/app/yachts", ""), "/app/yachts");
  assert.equal(sessionGateNext("/app", "?add=marina"), "/app?add=marina");
  assert.equal(sessionGateNext("/app", "add=marina"), "/app?add=marina");
  assert.equal(sessionGateNext("/app/trip", ""), "/app/trip");
  assert.equal(sessionGateNext("/app/request", ""), "/app/request");
  assert.equal(sessionGateNext("/fleet", ""), null);
  assert.equal(loginUrl("/app/yachts"), "/login?next=%2Fapp%2Fyachts");
  assert.equal(loginUrl("/app?add=marina"), "/login?next=%2Fapp%3Fadd%3Dmarina");
  assert.equal(loginUrl("/app/trip"), "/login?next=%2Fapp%2Ftrip");
  assert.equal(safeNextPath("//evil.example"), "/app");
  assert.equal(safeNextPath("https://evil.example"), "/app");
  assert.equal(safeNextPath("/app/yachts"), "/app/yachts");

  for (const file of [
    "app/app/yachts/page.tsx",
    "app/app/page.tsx",
    "app/app/trip/page.tsx",
    "app/book/page.tsx",
    "app/fleet/[id]/page.tsx",
  ]) {
    const src = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(src, /readSession/, file);
    assert.match(src, /redirect\(/, file);
  }
  const fleet = fs.readFileSync(new URL("../app/fleet/[id]/page.tsx", import.meta.url), "utf8");
  assert.match(fleet, /bookable === true/);
  const auth = fs.readFileSync(new URL("../components/AuthForm.tsx", import.meta.url), "utf8");
  assert.match(auth, /safeNextPath\(search\.get\("next"\)\)/);
  assert.match(auth, /router\.replace\(next\)/);
});

test("a 14.9 MB PDF is rejected on the client before upload", () => {
  const pdf = { size: Math.round(14.9 * 1024 * 1024), type: "application/pdf", name: "licence.pdf" };
  assert.equal(rawListingFileTooBig(pdf), true);
  assert.equal(pdf.size > LISTING_MAX_BYTES, true);
  assert.equal(
    rawListingFileTooBig({ size: LISTING_MAX_BYTES, type: "application/pdf", name: "ok.pdf" }),
    false,
  );
  assert.equal(
    rawListingFileTooBig({ size: pdf.size, type: "image/jpeg", name: "photo.jpg" }),
    false,
  );

  const src = fs.readFileSync(new URL("../components/app/AddYachtForm.tsx", import.meta.url), "utf8");
  assert.equal(src.includes(".json()"), false);
  assert.equal(src.includes("new FormData"), false);
  assert.match(src, /rawListingFileTooBig/);
  assert.match(src, /fileLimit/);
  const limitAt = src.indexOf("fileLimit");
  const firstFile = src.indexOf('name="owner_id"');
  assert.ok(limitAt >= 0 && firstFile > limitAt);
  const regionAt = src.indexOf("{c.region}");
  const region = src.slice(regionAt, regionAt + 280);
  assert.match(region, /\*/);
  assert.match(region, /captain_region" required/);
  assert.match(src, /value="draft"/);
  assert.match(src, /saveDraft/);
});

test("draft listings stay off the public fleet and only the owner can manage them", () => {
  assert.equal(isPublicListingStatus("listed"), true);
  assert.equal(isPublicListingStatus(undefined), true);
  assert.equal(isPublicListingStatus("draft"), false);
  assert.equal(isPublicListingStatus("unpublished"), false);
  assert.equal(canManageListing(USER_ID, USER_ID), true);
  assert.equal(canManageListing(USER_ID, "other"), false);
  assert.equal(canManageListing("", USER_ID), false);

  const parsed = parseStoredListingBody({
    listingId: LISTING_ID,
    owner_name: "Owner",
    name: "Yacht",
    hin: "ES-ABC12345D404",
    guests: 8,
    traits: "small",
    home_port: "Port Olimpic Barcelona",
    captain_name: "Captain",
    languages: "es",
    captain_region: "Mediterranean",
    status: "draft",
    files: {
      owner_id: "x",
      captain_id: "x",
      captain_mmc: "x",
      captain_photo: "x",
      yacht_photos: ["x"],
    },
  });
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.equal(parsed.status, "draft");

  const listed = parseStoredListingBody({
    listingId: LISTING_ID,
    owner_name: "Owner",
    name: "Yacht",
    hin: "ES-ABC12345D404",
    guests: 8,
    traits: "small",
    home_port: "Port Olimpic Barcelona",
    captain_name: "Captain",
    languages: "es",
    captain_region: "Mediterranean",
    files: {
      owner_id: "x",
      captain_id: "x",
      captain_mmc: "x",
      captain_photo: "x",
      yacht_photos: ["x"],
    },
  });
  assert.equal(listed.ok, true);
  if (listed.ok) assert.equal(listed.status, "listed");
});

test("delete targets both listing buckets for that owner and yacht", () => {
  const targets = listingStorageTargets(USER_ID, LISTING_ID);
  assert.deepEqual(
    targets.map((target) => target.bucket),
    ["kaenz-docs", "kaenz-listings"],
  );
  assert.equal(targets[0].folder, targets[1].folder);
  assert.match(targets[0].folder, new RegExp(`/${LISTING_ID}$`));
  assert.equal(targets[0].folder.includes(".."), false);

  const split = filesInListingFolder(targets[0].folder, [
    { name: "owner-id.pdf", id: "file-1" },
    { name: "captain-mmc.pdf", id: "file-2" },
    { name: "../catalog.json", id: "bad" },
    { name: "nested", id: null, metadata: null },
  ]);
  assert.deepEqual(split.files, [
    `${targets[0].folder}/owner-id.pdf`,
    `${targets[0].folder}/captain-mmc.pdf`,
  ]);
  assert.deepEqual(split.folders, [`${targets[0].folder}/nested`]);
  assert.throws(() => listingStorageTargets(USER_ID, "../etc"), /fields/);

  const route = fs.readFileSync(new URL("../lib/listing-store.ts", import.meta.url), "utf8");
  assert.match(route, /removeListingStorage/);
  assert.match(route, /created_by", userId/);
  assert.match(route, /status: "unpublished"/);
});

test("verification uses the auth confirmation timestamp and blocks submit", () => {
  assert.equal(confirmationSignal(null), "unknown");
  assert.equal(signalAllowsSubmit("unknown"), true);
  assert.equal(confirmationSignal({ email_confirmed_at: "2026-01-01T00:00:00Z" }), "confirmed");
  assert.equal(confirmationSignal({ user_metadata: { email_verified: true } }), "confirmed");
  assert.equal(confirmationSignal({ user_metadata: { email_verified: false } }), "unconfirmed");
  assert.equal(confirmationSignal({ email: "a@b.c" }), "unconfirmed");
  assert.equal(signalAllowsSubmit("unconfirmed"), false);
  assert.deepEqual(readAccountAccess('{"user":{"id":"1"},"verified":false}'), {
    user: true,
    verified: false,
  });
  assert.deepEqual(readAccountAccess('{"user":null,"verified":false}'), {
    user: false,
    verified: false,
  });
});
