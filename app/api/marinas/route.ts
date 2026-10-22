import { requireVerifiedUser } from "@/lib/account-verification";
import { logFunnel } from "@/lib/funnel";
import { buildMarinaDraft } from "@/lib/listing-draft";
import { listBookablePlaces } from "@/lib/inventory";
import { optionalWallet } from "@/lib/listings";
import {
  isCoord,
  isWebsite,
  listingToPlace,
  normalizeWebsite,
} from "@/lib/marina-listings";
import { insertMarinaListing } from "@/lib/marina-store";
import { mapHubs } from "@/lib/places";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  const { places, meta } = await listBookablePlaces();
  return Response.json({
    places,
    mapHubs: mapHubs.length,
    source: meta.source,
    note: meta.note,
  });
}

export async function POST(req: Request) {
  const gate = await requireVerifiedUser(req);
  if ("response" in gate) return gate.response;
  const user = gate.user;
  if (!getSupabaseAdmin()) {
    return Response.json({ error: "supabase" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  if (body.draft === true) {
    const draft = buildMarinaDraft({ name: body.name });
    if (!draft.ok) return Response.json({ error: draft.error }, { status: 400 });
    try {
      const listing = await insertMarinaListing({
        createdBy: user.id,
        kind: "marina",
        name: draft.name,
        lat: 0,
        lng: 0,
        address: "",
        region: "",
        dockmaster: "",
        phone: "",
        website: "",
        wallet: "",
        status: "draft",
      });
      logFunnel("listing_submitted", "marina");
      return Response.json({
        place: { id: listing.id, name: listing.name },
        documents: "pending",
        status: "draft",
      });
    } catch {
      return Response.json({ error: "save" }, { status: 500 });
    }
  }
  const kind = body.kind === "port" ? "port" : "marina";
  const name = String(body.name || "").trim();
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const address = String(body.address || "").trim();
  const region = String(body.region || "").trim();
  const dockmaster = String(body.dockmaster || "").trim();
  const phone = String(body.phone || "").trim();
  const website = normalizeWebsite(String(body.website || ""));
  // Optional: payouts run through Stripe Connect; invalid/empty is stored as "".
  const wallet = optionalWallet(body.wallet);

  if (!name || !address || !region || !dockmaster || !phone) {
    return Response.json({ error: "fields" }, { status: 400 });
  }
  if (!isCoord(lat, lng)) {
    return Response.json({ error: "coords" }, { status: 400 });
  }
  if (!isWebsite(website)) {
    return Response.json({ error: "website" }, { status: 400 });
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
    logFunnel("listing_submitted", "marina");
    return Response.json({ place: listingToPlace(listing) });
  } catch {
    return Response.json({ error: "save" }, { status: 500 });
  }
}
