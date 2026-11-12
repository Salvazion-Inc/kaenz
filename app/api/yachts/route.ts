import { requireVerifiedUser } from "@/lib/account-verification";
import { logFunnel } from "@/lib/funnel";
import {
  draftUpdateDecision,
  listingPublishDecision,
  mergeYachtDraft,
  missingDraftSlots,
  parseYachtDraftSave,
  type YachtDraftRecord,
} from "@/lib/listing-draft";
import { listBookableYachts } from "@/lib/inventory";
import {
  assertUploadedListingFile,
  insertYachtListing,
  readYachtDraftRow,
  updateOwnYachtDraft,
  uploadListingFile,
} from "@/lib/listing-store";
import {
  assertListingPaths,
  FILE_TOO_BIG_MESSAGE,
  isListingClientError,
  isListingId,
  listingFileTooBig,
  parseStoredListingBody,
} from "@/lib/listing-files";
import {
  isHin,
  listingHinDecision,
  listingToYacht,
  optionalWallet,
  parseLangs,
  parseTraits,
  type CaptainLang,
  type YachtTrait,
} from "@/lib/listings";
import { getSupabaseAdmin } from "@/lib/supabase";
import { yachts as catalogYachts } from "@/lib/yachts";

export const runtime = "nodejs";

function fileTooBigResponse() {
  return Response.json(
    { error: "file_too_big", message: FILE_TOO_BIG_MESSAGE },
    { status: 400 },
  );
}

function isImage(file: File) {
  return /image\/(jpeg|pjpeg|png|webp)/.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
}

function isDoc(file: File) {
  return isImage(file) || file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

function tooBig(file: File | null) {
  return Boolean(file && listingFileTooBig(file.size));
}

export async function GET() {
  const { yachts, meta } = await listBookableYachts();
  return Response.json({
    yachts,
    source: meta.source,
    note: meta.note,
    catalog: {
      count: catalogYachts.length,
      note: "Static marketing catalog on /fleet. Not live inventory.",
    },
  });
}

function listingErrorResponse(err: unknown) {
  const code = err instanceof Error ? err.message : "save";
  if (code === "supabase") return Response.json({ error: "supabase" }, { status: 503 });
  if (code === "file_too_big") return fileTooBigResponse();
  if (code === "forbidden") return Response.json({ error: "forbidden" }, { status: 403 });
  if (code === "missing") return Response.json({ error: "missing" }, { status: 404 });
  if (isListingClientError(code)) return Response.json({ error: code }, { status: 400 });
  return Response.json({ error: "save" }, { status: 500 });
}

function accessResponse(error: "forbidden" | "missing") {
  return Response.json({ error }, { status: error === "forbidden" ? 403 : 404 });
}

/**
 * Insert a new listing or update the caller's own draft. New photos are
 * appended. Private documents already on the draft stay when the form does
 * not upload a replacement. Incomplete papers or a dropped HIN stay draft
 * (DEC-20261104-03, DEC-20261105-15).
 */
async function saveOwnedListing(opts: {
  userId: string;
  role: "owner" | "captain";
  publish: boolean;
  listingId: string;
  ownerName: string;
  ownerWallet: string;
  name: string;
  hin: string;
  hinInvalid: boolean;
  guests: number | null;
  traits: YachtTrait[];
  homePort: string;
  captainName: string;
  captainLanguages: CaptainLang[];
  captainRegion: string;
  captainWallet: string;
  files: {
    owner_id: string;
    captain_id: string;
    captain_mmc: string;
    captain_photo: string;
    yacht_photos: string[];
  };
}) {
  if (!isListingId(opts.listingId)) return Response.json({ error: "fields" }, { status: 400 });
  const paths = assertListingPaths(opts.userId, opts.listingId, opts.files, { partial: true });
  if (!paths.ok) return Response.json({ error: paths.error }, { status: 400 });
  const existing = await readYachtDraftRow(opts.listingId);
  if (existing) {
    const decision = draftUpdateDecision(existing, opts.userId);
    if (decision !== "update") return accessResponse(decision);
  }
  const check = (path: string, kind: "photo" | "doc", error: string) =>
    path ? assertUploadedListingFile({ path, kind, error }) : Promise.resolve("");
  const [ownerIdUrl, captainIdUrl, captainMmcUrl, captainPhotoUrl, ...photos] = await Promise.all([
    check(opts.files.owner_id, "doc", "owner_id"),
    check(opts.files.captain_id, "doc", "captain_id"),
    check(opts.files.captain_mmc, "doc", "mmc"),
    check(opts.files.captain_photo, "photo", "captain_photo"),
    ...opts.files.yacht_photos.map((path) =>
      assertUploadedListingFile({ path, kind: "photo", error: "photos" }),
    ),
  ]);
  const merged = mergeYachtDraft(
    existing,
    {
      ownerName: opts.ownerName,
      ownerWallet: opts.ownerWallet,
      name: opts.name,
      hin: opts.hin,
      guests: opts.guests,
      traits: opts.traits,
      homePort: opts.homePort,
      captainName: opts.captainName,
      captainLanguages: opts.captainLanguages,
      captainRegion: opts.captainRegion,
      captainWallet: opts.captainWallet,
      ownerIdUrl,
      captainIdUrl,
      captainMmcUrl,
      captainPhoto: captainPhotoUrl,
      photos,
      status: "draft",
    },
    opts.listingId,
    opts.userId,
  );
  const missing = missingDraftSlots(merged);
  // Missing documents/photos or an unreadable HIN never block saving.
  const status = listingPublishDecision({
    publish: opts.publish,
    missing,
    hinInvalid: opts.hinInvalid,
    hin: opts.hin,
  });
  const listed = status === "listed";
  const next: YachtDraftRecord = { ...merged, status };
  const written = existing
    ? await updateOwnYachtDraft(opts.userId, next)
    : {
        ok: true as const,
        listing: await insertYachtListing({
          id: next.id,
          createdBy: opts.userId,
          ownerName: next.ownerName,
          ownerIdUrl: next.ownerIdUrl,
          ownerWallet: next.ownerWallet,
          name: next.name,
          hin: next.hin,
          guests: next.guests,
          traits: next.traits,
          homePort: next.homePort,
          photos: next.photos,
          captainName: next.captainName,
          captainIdUrl: next.captainIdUrl,
          captainMmcUrl: next.captainMmcUrl,
          captainPhoto: next.captainPhoto,
          captainLanguages: next.captainLanguages,
          captainRegion: next.captainRegion,
          captainWallet: next.captainWallet,
          status: next.status,
        }),
      };
  if (!written.ok) {
    if (written.error === "supabase") return Response.json({ error: "supabase" }, { status: 503 });
    return accessResponse(written.error);
  }
  logFunnel("listing_submitted", opts.role);
  const hin = opts.hinInvalid ? "invalid" : opts.hin ? "ok" : "empty";
  if (!listed) {
    return Response.json({
      yacht: { ...listingToYacht(written.listing), bookable: false },
      status: "draft",
      missing,
      hin,
      ...(missing.length ? { documents: "pending" } : { documents: "complete" }),
    });
  }
  return Response.json({ yacht: listingToYacht(written.listing), status: "listed", missing: [], hin });
}

async function postYachtDraft(body: unknown, user: { id: string; name: string }) {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const parsed = parseYachtDraftSave({
    ...record,
    owner_name: record.owner_name || user.name,
  });
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const role = record.role === "captain" ? "captain" : "owner";
  try {
    return await saveOwnedListing({
      userId: user.id,
      role,
      publish: false,
      listingId: parsed.listingId || crypto.randomUUID(),
      ownerName: parsed.ownerName,
      ownerWallet: parsed.ownerWallet,
      name: parsed.name,
      hin: parsed.hin,
      hinInvalid: parsed.hinInvalid,
      guests: parsed.guests,
      traits: parsed.traits,
      homePort: parsed.homePort,
      captainName: parsed.captainName,
      captainLanguages: parsed.captainLanguages,
      captainRegion: parsed.captainRegion,
      captainWallet: parsed.captainWallet,
      files: parsed.files,
    });
  } catch (err) {
    return listingErrorResponse(err);
  }
}

async function postStoredListing(body: unknown, userId: string) {
  const parsed = parseStoredListingBody(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  try {
    return await saveOwnedListing({
      userId,
      role: "owner",
      publish: true,
      listingId: parsed.listingId,
      ownerName: parsed.ownerName,
      ownerWallet: parsed.ownerWallet,
      name: parsed.name,
      hin: parsed.hin,
      hinInvalid: parsed.hinInvalid,
      guests: parsed.guests,
      traits: parsed.traits,
      homePort: parsed.homePort,
      captainName: parsed.captainName,
      captainLanguages: parsed.captainLanguages,
      captainRegion: parsed.captainRegion,
      captainWallet: parsed.captainWallet,
      files: parsed.files,
    });
  } catch (err) {
    return listingErrorResponse(err);
  }
}

export async function POST(req: Request) {
  const gate = await requireVerifiedUser(req);
  if ("response" in gate) return gate.response;
  const user = gate.user;
  if (!getSupabaseAdmin()) {
    return gate.seal(Response.json({ error: "supabase" }, { status: 503 }));
  }

  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null);
    if (body && typeof body === "object" && (body as { draft?: unknown }).draft === true) {
      return gate.seal(await postYachtDraft(body, user));
    }
    return gate.seal(await postStoredListing(body, user.id));
  }

  const form = await req.formData();
  const ownerName = String(form.get("owner_name") || "").trim();
  // Solana wallets are optional: payouts run through Stripe Connect and never
  // read these fields. Anything empty or invalid is stored as "" so a missing
  // wallet never blocks self-serve listing; it can be added later in Account.
  const ownerWallet = optionalWallet(form.get("owner_wallet"));
  const name = String(form.get("name") || "").trim();
  const hin = String(form.get("hin") || "").trim();
  const guests = Number(form.get("guests"));
  const traits = parseTraits(form.get("traits"));
  const homePort = String(form.get("home_port") || "").trim();
  const captainName = String(form.get("captain_name") || "").trim();
  const captainLanguages = parseLangs(form.get("languages"));
  const captainRegion = String(form.get("captain_region") || "").trim();
  const captainWallet = optionalWallet(form.get("captain_wallet"));

  const ownerId = form.get("owner_id");
  const captainId = form.get("captain_id");
  const captainMmc = form.get("captain_mmc");
  const captainPhoto = form.get("captain_photo");
  const yachtPhotos = form
    .getAll("yacht_photos")
    .filter((item): item is File => item instanceof File && item.size > 0)
    .slice(0, 5);

  if (!ownerName || !name || !captainName || !homePort || !captainRegion) {
    return gate.seal(Response.json({ error: "fields" }, { status: 400 }));
  }
  // HIN is optional. A tax ID or other non-hull value is stored blank and the
  // yacht stays a draft; it never rejects the rest of the form. DEC-20261105-15.
  const hinDecision = listingHinDecision(hin);
  const storedHin = isHin(hin) ? hinDecision.hin : "";
  if (!Number.isFinite(guests) || guests < 1 || guests > 50) {
    return gate.seal(Response.json({ error: "guests" }, { status: 400 }));
  }
  if (!traits.length) return gate.seal(Response.json({ error: "traits" }, { status: 400 }));
  if (!captainLanguages.length) {
    return gate.seal(Response.json({ error: "languages" }, { status: 400 }));
  }
  const uploaded = [ownerId, captainId, captainMmc, captainPhoto, ...yachtPhotos];
  if (uploaded.some((file) => file instanceof File && tooBig(file))) {
    return gate.seal(fileTooBigResponse());
  }
  const missingDocs: string[] = [];
  if (!(ownerId instanceof File) || ownerId.size <= 0) missingDocs.push("owner_id");
  if (!(captainId instanceof File) || captainId.size <= 0) missingDocs.push("captain_id");
  if (!(captainMmc instanceof File) || captainMmc.size <= 0) missingDocs.push("captain_mmc");
  if (!(captainPhoto instanceof File) || captainPhoto.size <= 0) missingDocs.push("captain_photo");
  if (!yachtPhotos.length) missingDocs.push("yacht_0");
  if (missingDocs.length) {
    return gate.seal(
      Response.json(
        {
          error: "documents",
          missing: missingDocs,
          message: `Add these documents before publishing: ${missingDocs.join(", ")}.`,
        },
        { status: 400 },
      ),
    );
  }
  if (!(ownerId instanceof File) || !isImage(ownerId)) {
    return gate.seal(Response.json({ error: "owner_id" }, { status: 400 }));
  }
  if (!(captainId instanceof File) || !isDoc(captainId)) {
    return gate.seal(Response.json({ error: "captain_id" }, { status: 400 }));
  }
  // captain_mmc is any skipper licence document (US MMC or a local licence such
  // as the Spanish PER/PPER, French permis côtier/hauturier, ICC, RYA…). Only the
  // file type and size are checked; no US-specific format is enforced.
  if (!(captainMmc instanceof File) || !isDoc(captainMmc)) {
    return gate.seal(Response.json({ error: "mmc" }, { status: 400 }));
  }
  if (!(captainPhoto instanceof File) || !isImage(captainPhoto)) {
    return gate.seal(Response.json({ error: "captain_photo" }, { status: 400 }));
  }
  if (yachtPhotos.some((file) => !isImage(file))) {
    return gate.seal(Response.json({ error: "photos" }, { status: 400 }));
  }

  const id = crypto.randomUUID();
  try {
    const [ownerIdUrl, captainIdUrl, captainMmcUrl, captainPhotoUrl, ...photos] =
      await Promise.all([
        uploadListingFile({ listingId: id, kind: "doc", name: "owner-id", file: ownerId }),
        uploadListingFile({ listingId: id, kind: "doc", name: "captain-id", file: captainId }),
        uploadListingFile({ listingId: id, kind: "doc", name: "captain-mmc", file: captainMmc }),
        uploadListingFile({
          listingId: id,
          kind: "photo",
          name: "captain-photo",
          file: captainPhoto,
        }),
        ...yachtPhotos.map((file, index) =>
          uploadListingFile({
            listingId: id,
            kind: "photo",
            name: `yacht-${index}`,
            file,
          }),
        ),
      ]);

    const listing = await insertYachtListing({
      id,
      createdBy: user.id,
      ownerName,
      ownerIdUrl,
      ownerWallet,
      name,
      hin: storedHin,
      guests,
      traits,
      homePort,
      photos,
      captainName,
      captainIdUrl,
      captainMmcUrl,
      captainPhoto: captainPhotoUrl,
      captainLanguages,
      captainRegion,
      captainWallet,
      status: storedHin ? "listed" : "draft",
    });
    logFunnel("listing_submitted", "owner");
    return gate.seal(
      Response.json({
        yacht: { ...listingToYacht(listing), bookable: Boolean(storedHin) },
        status: storedHin ? "listed" : "draft",
        hin: storedHin ? "ok" : hin ? "invalid" : "empty",
      }),
    );
  } catch {
    return gate.seal(Response.json({ error: "save" }, { status: 500 }));
  }
}
