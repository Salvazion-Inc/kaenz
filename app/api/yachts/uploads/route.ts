import { requireVerifiedUser } from "@/lib/account-verification";
import { signListingUploads } from "@/lib/listing-store";
import { validateListingFileSet } from "@/lib/listing-files";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/** Hands the browser a short-lived Supabase upload URL per file. */
export async function POST(req: Request) {
  const gate = await requireVerifiedUser(req);
  if ("response" in gate) return gate.response;
  const user = gate.user;
  if (!getSupabaseAdmin()) {
    return gate.seal(Response.json({ error: "supabase" }, { status: 503 }));
  }

  const body = (await req.json().catch(() => null)) as { files?: unknown } | null;
  const parsed = validateListingFileSet(body?.files);
  if (!parsed.ok) return gate.seal(Response.json({ error: parsed.error }, { status: 400 }));

  const listingId = crypto.randomUUID();
  try {
    const uploads = await signListingUploads({
      userId: user.id,
      listingId,
      files: parsed.files,
    });
    return gate.seal(Response.json({ listingId, uploads }));
  } catch (err) {
    const code = err instanceof Error ? err.message : "upload";
    if (code === "supabase") {
      return gate.seal(Response.json({ error: "supabase" }, { status: 503 }));
    }
    return gate.seal(Response.json({ error: "upload" }, { status: 500 }));
  }
}
