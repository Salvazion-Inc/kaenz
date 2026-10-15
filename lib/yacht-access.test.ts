import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { confirmationSignal, previewUnverifiedOverride, signalAllowsSubmit } from "./account-verification";
import { loginUrl, safeNextPath, sessionGateNext } from "./form-gate";
import {
  LISTING_MAX_BYTES,
  parseOwnedListingEdit,
  parseStoredListingBody,
  rawListingFileTooBig,
} from "./listing-files";
import { readAccountAccess } from "./submit-access";
import {
  canManageListing,
  deleteListingStorageFiles,
  filesInListingFolder,
  isPublicListingStatus,
  listingStatus,
  listingStorageTargets,
  managedListingStatus,
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
  assert.match(src, /listing-option/);
  assert.match(src, /aria-pressed/);
  assert.match(src, /cur === c\.fileTooBig/);
  assert.match(src, /manage\.preparing/);
  assert.match(src, /role="status"/);
  const traitsAt = src.indexOf('aria-label={c.traits}');
  const traitBlock = src.slice(traitsAt, traitsAt + 700);
  assert.equal(traitBlock.includes("rounded-full"), false);
});

test("draft listings stay off the public fleet and only the owner can manage them", () => {
  assert.equal(isPublicListingStatus("listed"), true);
  assert.equal(isPublicListingStatus(undefined), true);
  assert.equal(isPublicListingStatus("draft"), false);
  assert.equal(isPublicListingStatus("unpublished"), false);
  assert.equal(isPublicListingStatus("unlisted"), false);
  assert.equal(listingStatus("unpublished"), "unlisted");
  assert.equal(listingStatus("unlisted"), "unlisted");
  assert.equal(managedListingStatus("listed"), "listed");
  assert.equal(managedListingStatus("unpublished"), "unlisted");
  assert.equal(managedListingStatus("nope"), null);
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

test("delete targets both listing buckets for that owner and yacht", async () => {
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

  const store = fs.readFileSync(new URL("../lib/listing-store.ts", import.meta.url), "utf8");
  assert.match(store, /removeListingStorage/);
  assert.match(store, /deleteListingStorageFiles/);
  assert.match(store, /created_by", userId/);
  const owner = fs.readFileSync(new URL("./yacht-owner.ts", import.meta.url), "utf8");
  assert.match(owner, /listing-storage-removed/);
  const api = fs.readFileSync(new URL("../app/api/yachts/[id]/route.ts", import.meta.url), "utf8");
  assert.match(api, /managedListingStatus/);
  assert.match(api, /setOwnedListingStatus/);
  const tab = fs.readFileSync(new URL("../components/app/YachtsTab.tsx", import.meta.url), "utf8");
  assert.match(tab, /manage\.publish/);
  assert.match(tab, /manage\.unpublish/);
  assert.match(tab, /manage\.edit/);
  assert.match(tab, /"unlisted"/);

  const docsFolder = targets[0].folder;
  const photosFolder = targets[1].folder;
  const removed: Array<{ bucket: string; paths: string[] }> = [];
  const logs: string[] = [];
  const tree: Record<string, Record<string, Array<{ name: string; id: string }>>> = {
    "kaenz-docs": {
      [docsFolder]: [{ name: "owner-id.pdf", id: "a" }],
      [LISTING_ID]: [{ name: "legacy-doc.pdf", id: "b" }],
    },
    "kaenz-listings": {
      [photosFolder]: [{ name: "yacht-0.jpg", id: "c" }],
      [LISTING_ID]: [{ name: "legacy-photo.jpg", id: "d" }],
    },
  };
  const paths = await deleteListingStorageFiles(
    {
      async list(bucket, folder) {
        return tree[bucket]?.[folder] || [];
      },
      async remove(bucket, files) {
        removed.push({ bucket, paths: files });
        for (const file of files) {
          const name = file.split("/").pop() || "";
          const folder = file.slice(0, Math.max(0, file.length - name.length - 1));
          tree[bucket][folder] = (tree[bucket][folder] || []).filter((item) => item.name !== name);
        }
      },
    },
    USER_ID,
    LISTING_ID,
    (line) => logs.push(line),
  );
  assert.ok(paths.includes(`kaenz-docs/${docsFolder}/owner-id.pdf`));
  assert.ok(paths.includes(`kaenz-listings/${photosFolder}/yacht-0.jpg`));
  assert.ok(paths.includes(`kaenz-docs/${LISTING_ID}/legacy-doc.pdf`));
  assert.ok(paths.includes(`kaenz-listings/${LISTING_ID}/legacy-photo.jpg`));
  assert.equal(
    removed.some((call) => call.bucket === "kaenz-docs"),
    true,
  );
  assert.equal(
    removed.some((call) => call.bucket === "kaenz-listings"),
    true,
  );
  assert.equal(logs.length, 1);
  assert.match(logs[0], /^listing-storage-removed /);
  assert.match(logs[0], /kaenz-docs\//);
  assert.match(logs[0], /kaenz-listings\//);
  assert.equal(/secret|token|service_role|apikey|signedurl/i.test(logs[0]), false);
  assert.equal(tree["kaenz-docs"][docsFolder].length, 0);
  assert.equal(tree["kaenz-listings"][photosFolder].length, 0);
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

  const previous = process.env.VERCEL_ENV;
  try {
    process.env.VERCEL_ENV = "production";
    assert.equal(
      previewUnverifiedOverride(
        new Request("https://kaenz.com/api/yachts", {
          headers: { "x-kaenz-preview-unverified": "1" },
        }),
      ),
      false,
    );
    process.env.VERCEL_ENV = "preview";
    assert.equal(
      previewUnverifiedOverride(
        new Request("https://preview.example/api/yachts", {
          headers: { "x-kaenz-preview-unverified": "1" },
        }),
      ),
      true,
    );
    assert.equal(
      previewUnverifiedOverride(new Request("https://preview.example/api/yachts")),
      false,
    );
    delete process.env.VERCEL_ENV;
    assert.equal(
      previewUnverifiedOverride(
        new Request("https://localhost/api/yachts", {
          headers: { "x-kaenz-preview-unverified": "1" },
        }),
      ),
      false,
    );
  } finally {
    if (previous === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previous;
  }

  const edited = parseOwnedListingEdit({
    status: "listed",
    owner_name: "Owner",
    name: "Draft yacht",
    hin: "ES-ABC12345D404",
    guests: 8,
    traits: "small",
    home_port: "Port Olimpic Barcelona",
    captain_name: "Captain",
    languages: "es",
    captain_region: "Mediterranean",
  });
  assert.equal(edited.ok, true);
  if (edited.ok) assert.equal(edited.edit.status, "listed");

  const copy = fs.readFileSync(new URL("./copy.ts", import.meta.url), "utf8");
  assert.equal(copy.includes("No app login required"), false);
  assert.equal(copy.includes("No hace falta entrar"), false);
  assert.match(copy, /Sign in to book/);
  assert.match(copy, /Entra para reservar/);
  const appCopy = fs.readFileSync(new URL("./app-copy.ts", import.meta.url), "utf8");
  assert.equal(/needTrait: ".*characteristic/i.test(appCopy), false);
  assert.equal(appCopy.includes("característica"), false);
  assert.match(appCopy, /needTrait: "Pick at least one classification."/);
  const logout = fs.readFileSync(new URL("../app/api/auth/logout/route.ts", import.meta.url), "utf8");
  assert.match(logout, /303/);
  assert.match(logout, /clearSessionCookie\(false\)/);
  assert.match(logout, /clearSessionCookie\(true\)/);
  const form = fs.readFileSync(new URL("../components/LogoutForm.tsx", import.meta.url), "utf8");
  assert.match(form, /action="\/api\/auth\/logout"/);
  assert.match(form, /method="post"/);
  const nav = fs.readFileSync(new URL("../components/Nav.tsx", import.meta.url), "utf8");
  assert.match(nav, /\/api\/auth\/me/);
  assert.match(nav, /LogoutForm/);
  const splash = fs.readFileSync(new URL("../components/app/AppSplash.tsx", import.meta.url), "utf8");
  assert.match(splash, /pointer-events-none/);
  const fleet = fs.readFileSync(new URL("../app/fleet/[id]/page.tsx", import.meta.url), "utf8");
  assert.match(fleet, /bookable === true && !user/);
});
