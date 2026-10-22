import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { at } from "./app-copy";
import {
  FILE_TOO_BIG_MESSAGE,
  VERCEL_FUNCTION_BODY_LIMIT,
  assertListingPaths,
  classifyListingResponse,
  directListingPayload,
  isOwnedListingPath,
  listingFileTooBig,
  listingObjectPath,
  multipartBodyBytes,
  parseStoredListingBody,
  validateListingFileSet,
} from "./listing-files";
import { draftDeleteDecision, missingPublishDocuments } from "./listing-draft";
import { optionalWallet } from "./listings";

const LISTING_ID = "6f1e5c2a-9b34-4d70-8a11-0c2d4e6f8a90";
const USER_ID = "google:barcelona-partner";

const PRODUCTION_413 = `Request Entity Too Large

FUNCTION_PAYLOAD_TOO_LARGE

pdx1::kzqhd-1792012416781-643840ba6589
`;

function mb(n: number) {
  return Math.round(n * 1024 * 1024);
}

test("a 413 plain-text body is a human error, not a JSON parse error", () => {
  let parseMessage = "";
  try {
    JSON.parse(PRODUCTION_413);
  } catch (err) {
    parseMessage = err instanceof Error ? err.message : "";
  }
  assert.match(parseMessage, /Unexpected token/);
  assert.match(parseMessage, /Request En|Request Entity Too Large/);

  const classified = classifyListingResponse(413, PRODUCTION_413);
  assert.equal(classified.error, "too_large");
  const copy = at("en").addYacht;
  assert.equal(copy.tooLarge.includes("Unexpected token"), false);
  assert.equal(/not valid json/i.test(copy.tooLarge), false);
  assert.match(copy.tooLarge, /too large/i);

  const html = classifyListingResponse(502, "<html>Bad Gateway</html>");
  assert.equal(html.error, "http");
  assert.match(at("es").addYacht.badResponse, /inesperad/i);
});

test("files totaling more than 5 MB stay out of the Vercel function body", () => {
  const files = [
    { slot: "owner_id", filename: "owner-id.jpg", type: "image/jpeg", size: mb(1.6) },
    {
      slot: "captain_id",
      filename: "PPER Claudio Blanco renovacion Justificante_MFOM025232E186D20F32CA804104.pdf",
      type: "application/pdf",
      size: mb(2.4),
    },
    { slot: "captain_mmc", filename: "PPER Claudio.pdf", type: "application/pdf", size: mb(1.8) },
    { slot: "captain_photo", filename: "claudio-b.jpg", type: "image/jpeg", size: mb(2.2) },
    { slot: "yacht_0", filename: "yacht-port-olimpic.jpg", type: "image/jpeg", size: mb(1.7) },
  ];
  const fileBytes = files.reduce((sum, file) => sum + file.size, 0);
  assert.ok(fileBytes > 5 * 1024 * 1024, `expected >5 MB of files, got ${fileBytes}`);

  const legacy = multipartBodyBytes([
    { name: "owner_name", value: "Claudio Blanco Garcia" },
    { name: "owner_wallet", value: "" },
    { name: "name", value: "Port Olimpic" },
    { name: "hin", value: "ES-ABC12345D404" },
    { name: "guests", value: "8" },
    { name: "traits", value: "luxurious" },
    { name: "home_port", value: "Port Olimpic Barcelona" },
    { name: "captain_name", value: "Claudio Blanco Garcia" },
    { name: "languages", value: "es" },
    { name: "captain_region", value: "Mediterranean" },
    { name: "captain_wallet", value: "" },
    ...files.map((file) => ({
      name: file.slot === "yacht_0" ? "yacht_photos" : file.slot,
      filename: file.filename,
      type: file.type,
      size: file.size,
    })),
  ]);
  assert.ok(legacy > VERCEL_FUNCTION_BODY_LIMIT);
  assert.ok(legacy > 5 * 1024 * 1024);

  const checked = validateListingFileSet(
    files.map((file) => ({
      slot: file.slot,
      name: file.filename,
      type: file.type,
      size: file.size,
    })),
  );
  assert.equal(checked.ok, true);
  if (!checked.ok) return;

  const payload = directListingPayload({
    listingId: LISTING_ID,
    owner_name: "Claudio Blanco Garcia",
    owner_wallet: "",
    name: "Port Olimpic",
    hin: "ES-ABC12345D404",
    guests: "8",
    traits: "luxurious",
    home_port: "Port Olimpic Barcelona",
    captain_name: "Claudio Blanco Garcia",
    languages: "es",
    captain_region: "Mediterranean",
    captain_wallet: "",
    uploads: checked.files.map((file) => ({
      slot: file.slot,
      path: listingObjectPath(USER_ID, LISTING_ID, file.base, file.ext),
    })),
  });
  const jsonBytes = new TextEncoder().encode(JSON.stringify(payload)).length;
  assert.ok(jsonBytes < 8 * 1024, `listing JSON was ${jsonBytes} bytes`);
  assert.ok(jsonBytes < legacy);
  assert.equal(payload.owner_wallet, "");
  assert.equal(payload.captain_wallet, "");
  assert.equal(payload.files.yacht_photos.length, 1);
  console.log(
    JSON.stringify({
      fileBytes,
      legacyMultipartBytes: legacy,
      vercelLimit: VERCEL_FUNCTION_BODY_LIMIT,
      directJsonBytes: jsonBytes,
    }),
  );
});

test("empty Solana wallets stay optional and foreign paths are rejected", () => {
  assert.equal(optionalWallet(""), "");
  assert.equal(optionalWallet("   "), "");
  assert.equal(optionalWallet(undefined), "");
  assert.equal(optionalWallet("not a wallet"), "");

  const parsed = parseStoredListingBody({
    listingId: LISTING_ID,
    owner_name: "Owner",
    owner_wallet: "",
    name: "Yacht",
    hin: "ES-ABC12345D404",
    guests: 8,
    traits: "luxurious",
    home_port: "Port Olimpic Barcelona",
    captain_name: "Captain",
    languages: "es",
    captain_region: "Mediterranean",
    captain_wallet: "   ",
    files: {
      owner_id: "pending",
      captain_id: "pending",
      captain_mmc: "pending",
      captain_photo: "pending",
      yacht_photos: ["pending"],
    },
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.ownerWallet, "");
  assert.equal(parsed.captainWallet, "");

  const missingWallet = parseStoredListingBody({
    listingId: LISTING_ID,
    owner_name: "Owner",
    name: "Yacht",
    hin: "ES-ABC12345D404",
    guests: 8,
    traits: "small",
    home_port: "Port Olimpic Barcelona",
    captain_name: "Captain",
    languages: "es,en",
    captain_region: "Mediterranean",
    files: {
      owner_id: "x",
      captain_id: "x",
      captain_mmc: "x",
      captain_photo: "x",
      yacht_photos: ["x"],
    },
  });
  assert.equal(missingWallet.ok, true);
  if (missingWallet.ok) {
    assert.equal(missingWallet.ownerWallet, "");
    assert.equal(missingWallet.captainWallet, "");
  }

  assert.equal(
    isOwnedListingPath(USER_ID, LISTING_ID, "../catalog.json", "owner-id", false),
    false,
  );
  assert.equal(
    isOwnedListingPath("someone-else", LISTING_ID, "nope/owner-id.jpg", "owner-id", false),
    false,
  );

  const set = validateListingFileSet([
    { slot: "owner_id", name: "id.jpg", type: "image/jpeg", size: 1000 },
    { slot: "captain_id", name: "id.pdf", type: "application/pdf", size: 1000 },
    { slot: "captain_mmc", name: "licence.pdf", type: "application/pdf", size: 1000 },
    { slot: "captain_photo", name: "face.jpg", type: "image/jpeg", size: 1000 },
    { slot: "yacht_0", name: "boat.jpg", type: "image/jpeg", size: 1000 },
  ]);
  assert.equal(set.ok, true);
  if (!set.ok) return;
  const files = {
    owner_id: listingObjectPath(USER_ID, LISTING_ID, "owner-id", "jpg"),
    captain_id: listingObjectPath(USER_ID, LISTING_ID, "captain-id", "pdf"),
    captain_mmc: listingObjectPath(USER_ID, LISTING_ID, "captain-mmc", "pdf"),
    captain_photo: listingObjectPath(USER_ID, LISTING_ID, "captain-photo", "jpg"),
    yacht_photos: [listingObjectPath(USER_ID, LISTING_ID, "yacht-0", "jpg")],
  };
  assert.equal(assertListingPaths(USER_ID, LISTING_ID, files).ok, true);
  assert.equal(assertListingPaths("other-user", LISTING_ID, files).ok, false);
  assert.equal(
    assertListingPaths(USER_ID, LISTING_ID, { ...files, owner_id: `${files.owner_id}/../catalog.json` }).ok,
    false,
  );
  assert.equal(
    validateListingFileSet([
      { slot: "owner_id", name: "id.pdf", type: "application/pdf", size: 10 },
    ]).ok,
    false,
  );
  const huge = validateListingFileSet([
    { slot: "owner_id", name: "id.jpg", type: "image/jpeg", size: mb(9) },
    { slot: "captain_id", name: "id.pdf", type: "application/pdf", size: 1000 },
    { slot: "captain_mmc", name: "licence.pdf", type: "application/pdf", size: 1000 },
    { slot: "captain_photo", name: "face.jpg", type: "image/jpeg", size: 1000 },
    { slot: "yacht_0", name: "boat.jpg", type: "image/jpeg", size: 1000 },
  ]);
  assert.equal(huge.ok, false);
  if (!huge.ok) assert.equal(huge.error, "file_too_big");
  const pdf = validateListingFileSet([
    { slot: "owner_id", name: "id.pdf", type: "application/pdf", size: mb(14.9) },
    { slot: "captain_id", name: "id.pdf", type: "application/pdf", size: 1000 },
    { slot: "captain_mmc", name: "licence.pdf", type: "application/pdf", size: 1000 },
    { slot: "captain_photo", name: "face.jpg", type: "image/jpeg", size: 1000 },
    { slot: "yacht_0", name: "boat.jpg", type: "image/jpeg", size: 1000 },
  ]);
  assert.equal(pdf.ok, false);
  if (!pdf.ok) assert.equal(pdf.error, "file_too_big");
  assert.equal(listingFileTooBig(mb(14.9)), true);
  assert.equal(listingFileTooBig(mb(8)), false);
  assert.match(FILE_TOO_BIG_MESSAGE, /8 MB/);
});

test("the listing form does not post files through the function or require a wallet", () => {
  const src = fs.readFileSync(
    new URL("../components/app/AddYachtForm.tsx", import.meta.url),
    "utf8",
  );
  assert.equal(src.includes(".json()"), false);
  assert.equal(src.includes("new FormData"), false);
  assert.match(src, /application\/json/);
  assert.match(src, /\/api\/yachts\/uploads/);
  for (const name of ["owner_wallet", "captain_wallet"]) {
    const match = src.match(new RegExp(`name="${name}"[\\s\\S]*?/>`));
    assert.ok(match, name);
    assert.doesNotMatch(match[0], /required/);
    assert.match(match[0], /walletOptional/);
  }
  const route = fs.readFileSync(new URL("../app/api/yachts/route.ts", import.meta.url), "utf8");
  assert.match(route, /optionalWallet\(form\.get\("owner_wallet"\)\)/);
  assert.match(route, /optionalWallet\(form\.get\("captain_wallet"\)\)/);
  assert.match(route, /ownerWallet: parsed\.ownerWallet/);
  assert.match(route, /captainWallet: parsed\.captainWallet/);
  assert.match(src, /el\.value = ""/);
  assert.match(src, /LISTING_MAX_BYTES/);
  assert.match(src, /missingDocs/);
  const sizeAt = route.indexOf("return fileTooBigResponse()");
  const slotAt = route.indexOf('error: "owner_id"');
  assert.ok(sizeAt > 0 && slotAt > sizeAt);
  assert.match(route, /FILE_TOO_BIG_MESSAGE/);
  assert.match(route, /Add these documents before publishing/);
  const yachts = fs.readFileSync(new URL("../components/app/YachtsTab.tsx", import.meta.url), "utf8");
  assert.match(yachts, /\/api\/yachts\/drafts/);
  assert.match(yachts, /resumeDraft/);
  assert.match(yachts, /deleteDraft/);
  const owner = "user-1";
  assert.equal(
    draftDeleteDecision({ createdBy: owner, status: "draft" }, owner),
    "delete",
  );
  assert.equal(
    draftDeleteDecision({ createdBy: "other", status: "draft" }, owner),
    "forbidden",
  );
  assert.equal(
    draftDeleteDecision({ createdBy: owner, status: "listed" }, owner),
    "forbidden",
  );
  assert.equal(draftDeleteDecision(null, owner), "missing");
  assert.deepEqual(missingPublishDocuments([]), [
    "owner_id",
    "captain_id",
    "captain_mmc",
    "captain_photo",
    "yacht_0",
  ]);
  assert.deepEqual(
    missingPublishDocuments(["owner_id", "captain_id", "captain_mmc", "captain_photo", "yacht_0"]),
    [],
  );
});
