import { deleteOwnedListing, unpublishOwnedListing } from "@/lib/listing-store";
import { cookieValue, readSession, SESSION_COOKIE } from "@/lib/session";

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

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await actor(req);
  if (!user) return Response.json({ error: "auth" }, { status: 401 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { status?: unknown } | null;
  if (!body || body.status !== "unpublished") {
    return Response.json({ error: "fields" }, { status: 400 });
  }
  try {
    await unpublishOwnedListing(user.id, id);
    return Response.json({ id, status: "unpublished" });
  } catch (err) {
    return ownerError(err);
  }
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
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
