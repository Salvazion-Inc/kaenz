import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  draftUpdateDecision,
  listingInsertStatus,
  listingPublishDecision,
  mergeDraftPhotos,
  mergeYachtDraft,
  missingDraftSlots,
  nextYachtPhotoIndex,
  parseYachtDraftSave,
  toYachtDraftResume,
  type YachtDraftRecord,
} from "./listing-draft";
import {
  assertListingPaths,
  listingObjectPath,
  remapYachtPhotoSlots,
  validateListingFileSet,
} from "./listing-files";

const OWNER = "user-1";
const OTHER = "user-2";
const ID = "11111111-2222-4333-8444-555555555555";

function photo(name: string) {
  return `https://cdn.example/listings/${name}.jpg`;
}

function record(overrides: Partial<YachtDraftRecord> = {}): YachtDraftRecord {
  return {
    id: ID,
    slug: "yate-11111111",
    createdBy: OWNER,
    status: "draft",
    ownerName: "Owner",
    ownerWallet: "",
    name: "Yate",
    hin: "ESABC12345D404",
    guests: 8,
    traits: ["luxurious"],
    homePort: "Miami Beach Marina",
    photos: [photo("yacht-0"), photo("yacht-1"), photo("yacht-2")],
    captainName: "Captain",
    captainPhoto: photo("captain"),
    captainLanguages: ["es"],
    captainRegion: "Miami",
    captainWallet: "",
    createdAt: "2026-11-12T00:00:00.000Z",
    ownerIdUrl: "b3duZXI/11111111-2222-4333-8444-555555555555/owner-id.jpg",
    captainIdUrl: "b3duZXI/11111111-2222-4333-8444-555555555555/captain-id.pdf",
    captainMmcUrl: "b3duZXI/11111111-2222-4333-8444-555555555555/captain-mmc.pdf",
    ...overrides,
  };
}

test("draft update is allowed only for the creator and only while it is a draft", () => {
  assert.equal(draftUpdateDecision({ createdBy: OWNER, status: "draft" }, OWNER), "update");
  assert.equal(draftUpdateDecision({ createdBy: OTHER, status: "draft" }, OWNER), "forbidden");
  assert.equal(draftUpdateDecision({ createdBy: OWNER, status: "listed" }, OWNER), "forbidden");
  assert.equal(draftUpdateDecision(null, OWNER), "missing");
  assert.equal(draftUpdateDecision({ createdBy: "", status: "draft" }, OWNER), "missing");
});

test("insert status defaults to draft and lists only when asked", () => {
  assert.equal(listingInsertStatus(undefined), "draft");
  assert.equal(listingInsertStatus(""), "draft");
  assert.equal(listingInsertStatus("draft"), "draft");
  assert.equal(listingInsertStatus("listed"), "listed");
  const store = fs.readFileSync(new URL("./listing-store.ts", import.meta.url), "utf8");
  assert.match(store, /listingInsertStatus\(row\.status\)/);
});

test("saving a draft keeps existing photos and appends new ones", () => {
  const existing = [photo("yacht-0"), photo("yacht-1"), photo("yacht-2")];
  const incoming = [photo("yacht-3"), photo("yacht-0")];
  assert.deepEqual(mergeDraftPhotos(existing, incoming), [
    photo("yacht-0"),
    photo("yacht-1"),
    photo("yacht-2"),
    photo("yacht-3"),
  ]);
  assert.deepEqual(mergeDraftPhotos(existing, []), existing);
  assert.equal(mergeDraftPhotos(existing, [photo("yacht-3"), photo("yacht-4"), photo("extra")]).length, 5);
  assert.equal(mergeDraftPhotos(existing, [photo("extra")])[0], photo("yacht-0"));

  const merged = mergeYachtDraft(
    record(),
    {
      ownerName: "Owner",
      ownerWallet: "",
      name: "Yate",
      hin: "ESABC12345D404",
      guests: null,
      traits: ["luxurious"],
      homePort: "Miami Beach Marina",
      captainName: "Captain",
      captainLanguages: ["es"],
      captainRegion: "",
      captainWallet: "",
      ownerIdUrl: "",
      captainIdUrl: "",
      captainMmcUrl: "",
      captainPhoto: "",
      photos: [photo("yacht-3")],
      status: "draft",
    },
    ID,
    OWNER,
  );
  assert.deepEqual(merged.photos, [...existing, photo("yacht-3")]);
  assert.equal(merged.ownerIdUrl, record().ownerIdUrl);
  assert.equal(merged.captainIdUrl, record().captainIdUrl);
  assert.equal(merged.captainMmcUrl, record().captainMmcUrl);
  assert.equal(merged.captainPhoto, photo("captain"));
  assert.equal(merged.guests, 8);
  assert.equal(merged.captainRegion, "Miami");
  assert.equal(merged.createdBy, OWNER);
  assert.deepEqual(missingDraftSlots(merged), []);
});

test("resume payload includes HIN and public photos and never private paths", () => {
  const view = toYachtDraftResume(
    record({
      photos: [photo("yacht-0"), photo("yacht-1"), photo("yacht-2"), "secret/yacht-private.jpg"],
      captainPhoto: "secret/captain-photo.jpg",
    }),
  );
  assert.equal(view.id, ID);
  assert.equal(view.hin, "ESABC12345D404");
  assert.deepEqual(view.photos, [photo("yacht-0"), photo("yacht-1"), photo("yacht-2")]);
  assert.equal(view.captainPhoto, "");
  assert.deepEqual(view.documents, {
    ownerId: true,
    captainId: true,
    captainMmc: true,
    captainPhoto: true,
  });
  assert.equal(view.guests, 8);
  assert.deepEqual(view.traits, ["luxurious"]);
  const json = JSON.stringify(view);
  assert.equal(json.includes("owner-id"), false);
  assert.equal(json.includes("captain-id"), false);
  assert.equal(json.includes("captain-mmc"), false);
  assert.equal(json.includes("secret/"), false);
  assert.equal(json.includes("ownerIdUrl"), false);
});

test("a new photo slot starts after the photos already stored", () => {
  const photos = [photo("yacht-0"), photo("yacht-1"), photo("yacht-2")];
  assert.equal(nextYachtPhotoIndex(photos), 3);
  assert.equal(nextYachtPhotoIndex([]), 0);
  assert.equal(nextYachtPhotoIndex([photo("a"), photo("b"), photo("c")]), 3);
  const checked = validateListingFileSet(
    [
      { slot: "yacht_0", name: "new-a.jpg", type: "image/jpeg", size: 1000 },
      { slot: "yacht_1", name: "new-b.jpg", type: "image/jpeg", size: 1000 },
    ],
    { partial: true },
  );
  assert.equal(checked.ok, true);
  if (!checked.ok) return;
  const remapped = remapYachtPhotoSlots(checked.files, 3);
  assert.equal(remapped.ok, true);
  if (!remapped.ok) return;
  assert.deepEqual(
    remapped.files.map((file) => file.base),
    ["yacht-3", "yacht-4"],
  );
  assert.deepEqual(
    remapped.files.map((file) => file.slot),
    ["yacht_0", "yacht_1"],
  );
  const overflow = remapYachtPhotoSlots(checked.files, 4);
  assert.equal(overflow.ok, false);

  const path = listingObjectPath(OWNER, ID, "yacht-3", "jpg");
  assert.equal(
    assertListingPaths(OWNER, ID, {
      owner_id: "",
      captain_id: "",
      captain_mmc: "",
      captain_photo: "",
      yacht_photos: [path],
    }, { partial: true }).ok,
    true,
  );
});

test("save draft keeps a valid HIN and drops a tax ID without blocking", () => {
  const saved = parseYachtDraftSave({
    listingId: ID,
    name: "Yate",
    home_port: "Miami",
    owner_name: "Owner",
    captain_name: "Captain",
    hin: "ES-ABC12345D404",
    guests: "8",
    traits: "luxurious",
    languages: "es",
    captain_region: "Miami",
    files: { yacht_photos: ["owned/yacht-0.jpg"] },
  });
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  assert.equal(saved.hin, "ESABC12345D404");
  assert.equal(saved.hinInvalid, false);
  assert.deepEqual(saved.files.yacht_photos, ["owned/yacht-0.jpg"]);

  const nif = parseYachtDraftSave({ name: "Yate", hin: "ES-25627687Y" });
  assert.equal(nif.ok, true);
  if (!nif.ok) return;
  assert.equal(nif.hin, "");
  assert.equal(nif.hinInvalid, true);
  assert.equal(nif.name, "Yate");

  assert.equal(
    listingPublishDecision({ publish: true, missing: [], hinInvalid: true, hin: "" }),
    "draft",
  );
  assert.equal(
    listingPublishDecision({ publish: true, missing: ["owner_id"], hinInvalid: false, hin: "ESABC12345D404" }),
    "draft",
  );
  assert.equal(
    listingPublishDecision({ publish: false, missing: [], hinInvalid: false, hin: "ESABC12345D404" }),
    "draft",
  );
  assert.equal(
    listingPublishDecision({ publish: true, missing: [], hinInvalid: false, hin: "ESABC12345D404" }),
    "listed",
  );
});

test("draft routes load the full draft and update it in place", () => {
  const route = fs.readFileSync(new URL("../app/api/yachts/route.ts", import.meta.url), "utf8");
  const drafts = fs.readFileSync(new URL("../app/api/yachts/drafts/route.ts", import.meta.url), "utf8");
  const uploads = fs.readFileSync(new URL("../app/api/yachts/uploads/route.ts", import.meta.url), "utf8");
  const form = fs.readFileSync(new URL("../components/app/AddYachtForm.tsx", import.meta.url), "utf8");
  const tab = fs.readFileSync(new URL("../components/app/YachtsTab.tsx", import.meta.url), "utf8");
  assert.match(route, /updateOwnYachtDraft/);
  assert.match(route, /readYachtDraftRow/);
  assert.match(route, /listingPublishDecision/);
  assert.match(route, /mergeYachtDraft/);
  assert.match(drafts, /toYachtDraftResume/);
  assert.equal(drafts.includes("ownerIdUrl"), false);
  assert.equal(drafts.includes("owner_id_url"), false);
  assert.match(uploads, /claimDraftUpload/);
  assert.match(uploads, /remapYachtPhotoSlots/);
  assert.equal(uploads.includes("crypto.randomUUID()"), false);
  assert.match(form, /listingId/);
  assert.match(form, /hin: hinRaw/);
  assert.match(form, /draft: true/);
  assert.match(form, /existingPhotos/);
  assert.match(form, /defaultValue=\{initial\?\.hin/);
  assert.match(tab, /key=\{resume\?\.id/);
  assert.match(tab, /info\?\.message/);
});
