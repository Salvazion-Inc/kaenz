import { requireVerifiedUser } from "@/lib/account-verification";
import { claimDraftUpload, signListingUploads } from "@/lib/listing-store";
import { FILE_TOO_BIG_MESSAGE, remapYachtPhotoSlots, validateListingFileSet } from "@/lib/listing-files";
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

  const body = (await req.json().catch(() => null)) as
    | { files?: unknown; partial?: unknown; listingId?: unknown }
    | null;
  // partial: the owner may save a draft with only some (or none) of the files.
  const parsed = validateListingFileSet(body?.files, { partial: body?.partial === true });
  if (!parsed.ok) {
    if (parsed.error === "file_too_big") {
      return gate.seal(
        Response.json(
          { error: "file_too_big", message: FILE_TOO_BIG_MESSAGE },
          { status: 400 },
        ),
      );
    }
    return gate.seal(Response.json({ error: parsed.error }, { status: 400 }));
  }

  const requested = typeof body?.listingId === "string" ? body.listingId : "";
  try {
    const claim = await claimDraftUpload(user.id, requested);
    if (!claim.ok) {
      const status = claim.error === "forbidden" ? 403 : claim.error === "supabase" ? 503 : 400;
      return gate.seal(Response.json({ error: claim.error }, { status }));
    }
    const remapped = remapYachtPhotoSlots(parsed.files, claim.nextPhotoIndex);
    if (!remapped.ok) return gate.seal(Response.json({ error: remapped.error }, { status: 400 }));
    const uploads = await signListingUploads({
      userId: user.id,
      listingId: claim.listingId,
      files: remapped.files,
    });
    return gate.seal(Response.json({ listingId: claim.listingId, uploads }));
  } catch (err) {
    const code = err instanceof Error ? err.message : "upload";
    if (code === "supabase") {
      return gate.seal(Response.json({ error: "supabase" }, { status: 503 }));
    }
    return gate.seal(Response.json({ error: "upload" }, { status: 500 }));
  }
}
