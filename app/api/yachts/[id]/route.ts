import { parseOwnedListingEdit } from "@/lib/listing-files";
import {
  deleteOwnedListing,
  getOwnedListing,
  setOwnedListingStatus,
  updateOwnedListing,
} from "@/lib/listing-store";
import { cookieValue, readSession, SESSION_COOKIE } from "@/lib/session";
import { managedListingStatus } from "@/lib/yacht-owner";

export const runtime = "nodejs";

function ownerError(err: unknown) {
  const code = err instanceof Error ? err.message : "save";
  if (code === "fields") return Response.json({ error: "fields" }, { status: 400 });
  if (code === "forbidden") return Response.json({ error: "forbidden" }, { status: 403 });
  if (code === "missing") return Response.json({ error: "missing" }, { status: 404 });
  if (code === "supabase") return Response.json({ error: "supabase" }, { status: 503 });
  return Response.json({ error: "save" }, { status: 500 });
}

async function actor(req: Request) {
  return readSession(cookieValue(req.headers.get("cookie"), SESSION_COOKIE));
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await actor(req);
  if (!user) return Response.json({ error: "auth" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const row = await getOwnedListing(user.id, id);
    return Response.json({
      yacht: {
        id: row.id,
        name: row.name,
        status: row.status,
        homePort: row.homePort,
        guests: row.guests,
        hin: row.hin,
        traits: row.traits,
        photos: row.photos,
        ownerName: row.ownerName,
        ownerWallet: row.ownerWallet,
        captainName: row.captainName,
        captainLanguages: row.captainLanguages,
        captainRegion: row.captainRegion,
        captainWallet: row.captainWallet,
      },
    });
  } catch (err) {
    return ownerError(err);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await actor(req);
  if (!user) return Response.json({ error: "auth" }, { status: 401 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "fields" }, { status: 400 });
  const keys = Object.keys(body);
  try {
    if (keys.length === 1 && keys[0] === "status") {
      const status = managedListingStatus(body.status);
      if (!status) return Response.json({ error: "fields" }, { status: 400 });
      await setOwnedListingStatus(user.id, id, status);
      return Response.json({ id, status });
    }
    const parsed = parseOwnedListingEdit(body);
    if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
    await updateOwnedListing(user.id, id, parsed.edit);
    return Response.json({ id, status: parsed.edit.status, name: parsed.edit.name });
  } catch (err) {
    return ownerError(err);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await actor(req);
  if (!user) return Response.json({ error: "auth" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    await deleteOwnedListing(user.id, id);
    return Response.json({ id, deleted: true });
  } catch (err) {
    return ownerError(err);
  }
}
