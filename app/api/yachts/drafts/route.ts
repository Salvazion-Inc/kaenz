import { requireVerifiedUser } from "@/lib/account-verification";
import { deleteOwnYachtDraft, listOwnYachtDrafts } from "@/lib/listing-store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = await requireVerifiedUser(req);
  if ("response" in gate) return gate.response;
  const drafts = await listOwnYachtDrafts(gate.user.id);
  return Response.json({
    drafts: drafts.map((row) => ({
      id: row.id,
      name: row.name,
      homePort: row.homePort,
      ownerName: row.ownerName,
      captainName: row.captainName,
      status: "draft" as const,
    })),
  });
}

export async function DELETE(req: Request) {
  const gate = await requireVerifiedUser(req);
  if ("response" in gate) return gate.response;
  const id = new URL(req.url).searchParams.get("id") || "";
  const result = await deleteOwnYachtDraft(gate.user.id, id);
  if (result === "delete") return Response.json({ ok: true });
  if (result === "forbidden") {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  return Response.json({ error: "missing" }, { status: 404 });
}
