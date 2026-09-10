import { cookieValue, readSession, SESSION_COOKIE } from "@/lib/session";
import { listBookableYachts } from "@/lib/inventory";
import {
  insertYachtListing,
  uploadListingFile,
} from "@/lib/listing-store";
import {
  isHin,
  isSolanaWallet,
  listingToYacht,
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

export async function POST(req: Request) {
  const user = await readSession(
    cookieValue(req.headers.get("cookie"), SESSION_COOKIE),
  );
  if (!user) {
    return Response.json({ error: "auth" }, { status: 401 });
  }
  if (!getSupabaseAdmin()) {
    return Response.json({ error: "supabase" }, { status: 503 });
  }

  const form = await req.formData();
  const ownerName = String(form.get("owner_name") || "").trim();
  const ownerWallet = String(form.get("owner_wallet") || "").trim();
  const name = String(form.get("name") || "").trim();
  const hin = String(form.get("hin") || "").trim();
  const guests = Number(form.get("guests"));
  const traits = parseTraits(form.get("traits"));
  const homePort = String(form.get("home_port") || "").trim();
  const captainName = String(form.get("captain_name") || "").trim();
  const captainLanguages = parseLangs(form.get("languages"));
  const captainRegion = String(form.get("captain_region") || "").trim();
  const captainWallet = String(form.get("captain_wallet") || "").trim();

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
  if (!isSolanaWallet(ownerWallet) || !isSolanaWallet(captainWallet)) {
    return Response.json({ error: "wallet" }, { status: 400 });
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
