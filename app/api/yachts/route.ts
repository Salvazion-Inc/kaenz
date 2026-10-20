import { requireVerifiedUser } from "@/lib/account-verification";
import { cookieValue, readSession, SESSION_COOKIE } from "@/lib/session";
import { listBookableYachts } from "@/lib/inventory";
import {
  assertUploadedListingFile,
  insertYachtListing,
  uploadListingFile,
} from "@/lib/listing-store";
import {
  assertListingPaths,
  isListingClientError,
  parseStoredListingBody,
} from "@/lib/listing-files";
import {
  isHin,
  listingToYacht,
  optionalWallet,
  parseLangs,
  parseTraits,
} from "@/lib/listings";
import { getSupabaseAdmin } from "@/lib/supabase";
import { yachts as catalogYachts } from "@/lib/yachts";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

function isImage(file: File) {
  return /image\/(jpeg|pjpeg|png|webp)/.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
}

function isDoc(file: File) {
  return isImage(file) || file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

function tooBig(file: File | null) {
  return Boolean(file && file.size > MAX_BYTES);
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
  if (isListingClientError(code)) return Response.json({ error: code }, { status: 400 });
  return Response.json({ error: "save" }, { status: 500 });
}

async function postStoredListing(req: Request, userId: string) {
  const parsed = parseStoredListingBody(await req.json().catch(() => null));
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const paths = assertListingPaths(userId, parsed.listingId, parsed.files);
  if (!paths.ok) return Response.json({ error: paths.error }, { status: 400 });
  try {
    const [ownerIdUrl, captainIdUrl, captainMmcUrl, captainPhotoUrl, ...photos] =
      await Promise.all([
        assertUploadedListingFile({
          path: parsed.files.owner_id,
          kind: "doc",
          error: "owner_id",
        }),
        assertUploadedListingFile({
          path: parsed.files.captain_id,
          kind: "doc",
          error: "captain_id",
        }),
        assertUploadedListingFile({
          path: parsed.files.captain_mmc,
          kind: "doc",
          error: "mmc",
        }),
        assertUploadedListingFile({
          path: parsed.files.captain_photo,
          kind: "photo",
          error: "captain_photo",
        }),
        ...parsed.files.yacht_photos.map((path) =>
          assertUploadedListingFile({ path, kind: "photo", error: "photos" }),
        ),
      ]);
    const listing = await insertYachtListing({
      id: parsed.listingId,
      createdBy: userId,
      ownerName: parsed.ownerName,
      ownerIdUrl,
      ownerWallet: parsed.ownerWallet,
      name: parsed.name,
      hin: parsed.hin,
      guests: parsed.guests,
      traits: parsed.traits,
      homePort: parsed.homePort,
      photos,
      captainName: parsed.captainName,
      captainIdUrl,
      captainMmcUrl,
      captainPhoto: captainPhotoUrl,
      captainLanguages: parsed.captainLanguages,
      captainRegion: parsed.captainRegion,
      captainWallet: parsed.captainWallet,
    });
    return Response.json({ yacht: listingToYacht(listing) });
  } catch (err) {
    return listingErrorResponse(err);
  }
}

export async function POST(req: Request) {
  const user = await readSession(
    cookieValue(req.headers.get("cookie"), SESSION_COOKIE),
  );
  if (!user) {
    return Response.json({ error: "auth" }, { status: 401 });
  }
  const gate = await requireVerifiedUser(req);
  if ("response" in gate) return gate.response;
  if (!getSupabaseAdmin()) {
    return Response.json({ error: "supabase" }, { status: 503 });
  }

  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return postStoredListing(req, user.id);
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
    return Response.json({ error: "fields" }, { status: 400 });
  }
  if (!isHin(hin)) return Response.json({ error: "hin" }, { status: 400 });
  if (!Number.isFinite(guests) || guests < 1 || guests > 50) {
    return Response.json({ error: "guests" }, { status: 400 });
  }
  if (!traits.length) return Response.json({ error: "traits" }, { status: 400 });
  if (!captainLanguages.length) {
    return Response.json({ error: "languages" }, { status: 400 });
  }
  if (!(ownerId instanceof File) || !isImage(ownerId) || tooBig(ownerId)) {
    return Response.json({ error: "owner_id" }, { status: 400 });
  }
  if (!(captainId instanceof File) || !isDoc(captainId) || tooBig(captainId)) {
    return Response.json({ error: "captain_id" }, { status: 400 });
  }
  // captain_mmc is any skipper licence document (US MMC or a local licence such
  // as the Spanish PER/PPER, French permis côtier/hauturier, ICC, RYA…). Only the
  // file type and size are checked; no US-specific format is enforced.
  if (!(captainMmc instanceof File) || !isDoc(captainMmc) || tooBig(captainMmc)) {
    return Response.json({ error: "mmc" }, { status: 400 });
  }
  if (
    !(captainPhoto instanceof File) ||
    !isImage(captainPhoto) ||
    tooBig(captainPhoto)
  ) {
    return Response.json({ error: "captain_photo" }, { status: 400 });
  }
  if (
    yachtPhotos.length < 1 ||
    yachtPhotos.some((file) => !isImage(file) || tooBig(file))
  ) {
    return Response.json({ error: "photos" }, { status: 400 });
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
      hin,
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
    });
    return Response.json({ yacht: listingToYacht(listing) });
  } catch {
    return Response.json({ error: "save" }, { status: 500 });
  }
}
