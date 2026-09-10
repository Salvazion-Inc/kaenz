import { cookieValue, readSession, SESSION_COOKIE } from "@/lib/session";
import { listBookablePlaces } from "@/lib/inventory";
import { isSolanaWallet } from "@/lib/listings";
import {
  isCoord,
  isWebsite,
  listingToPlace,
  normalizeWebsite,
} from "@/lib/marina-listings";
import { insertMarinaListing } from "@/lib/marina-store";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  const { places, meta } = await listBookablePlaces();
  return Response.json({
    places,
    source: meta.source,
    note: meta.note,
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

  const body = await req.json().catch(() => ({}));
  const kind = body.kind === "port" ? "port" : "marina";
  const name = String(body.name || "").trim();
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const address = String(body.address || "").trim();
  const region = String(body.region || "").trim();
  const dockmaster = String(body.dockmaster || "").trim();
  const phone = String(body.phone || "").trim();
  const website = normalizeWebsite(String(body.website || ""));
  const wallet = String(body.wallet || "").trim();

  if (!name || !address || !region || !dockmaster || !phone) {
    return Response.json({ error: "fields" }, { status: 400 });
  }
  if (!isCoord(lat, lng)) {
    return Response.json({ error: "coords" }, { status: 400 });
  }
  if (!isWebsite(website)) {
    return Response.json({ error: "website" }, { status: 400 });
  }
  if (!isSolanaWallet(wallet)) {
    return Response.json({ error: "wallet" }, { status: 400 });
  }

  try {
    const listing = await insertMarinaListing({
      createdBy: user.id,
      kind,
      name,
      lat,
      lng,
      address,
      region,
      dockmaster,
      phone,
      website,
      wallet,
    });
    return Response.json({ place: listingToPlace(listing) });
  } catch {
    return Response.json({ error: "save" }, { status: 500 });
  }
}
