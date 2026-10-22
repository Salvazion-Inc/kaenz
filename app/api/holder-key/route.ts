import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/account-verification";
import { PROFILE_COOKIE, readProfileMap } from "@/lib/profile";
import { resolveHolderKey } from "@/lib/salvazion-key";
import { cookieValue } from "@/lib/session";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Read-only Premium access check for the wallet saved in Account.
 * No session → 401. The flag defaults off. This route never writes.
 */
export async function GET(req: Request) {
  const gate = await requireSessionUser(req);
  if ("response" in gate) return gate.response;

  const wallet = await savedWallet(req, gate.user.id);
  const decision = await resolveHolderKey(wallet);
  return gate.seal(
    NextResponse.json({
      premium: decision.premium,
      reason: decision.reason,
    }),
  );
}

/**
 * Same source as GET /api/profile: the account cookie wins when present,
 * otherwise the row in profiles.solana_wallet. A miss is an empty wallet.
 */
async function savedWallet(req: Request, userId: string): Promise<string> {
  const map = await readProfileMap(
    cookieValue(req.headers.get("cookie"), PROFILE_COOKIE),
  );
  const local = map[userId];
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("solana_wallet")
        .eq("id", userId)
        .maybeSingle();
      if (data) {
        if (local) return String(local.solanaWallet || "").trim();
        return String(data.solana_wallet || "").trim();
      }
    } catch {
      /* cookie profile still works */
    }
  }
  return String(local?.solanaWallet || "").trim();
}
