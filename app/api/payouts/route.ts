import { requireSessionUser } from "@/lib/account-verification";
import { parseCountry, refreshPartner, startOnboarding } from "@/lib/payouts";
import { appOrigin, getStripe, stripeConfigured } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Payout onboarding binds a Stripe account to a Kaenz session user id. That is
 * only safe when sessions are signed with a private AUTH_SECRET (the fallback
 * key in lib/session.ts is public in this repo), so fail closed without it.
 */
function guard() {
  if (!process.env.AUTH_SECRET) return "auth_secret";
  if (!stripeConfigured()) return "stripe_unconfigured";
  if (!getSupabaseAdmin()) return "supabase";
  return "";
}

/** Current payout status; releases retained shares once the account is active. */
export async function GET(req: Request) {
  const gate = await requireSessionUser(req);
  if ("response" in gate) return gate.response;
  const user = gate.user;
  const blocked = guard();
  if (blocked) {
    return gate.seal(
      Response.json({ status: "unavailable", reason: blocked, pendingCents: 0 }),
    );
  }
  try {
    const result = await refreshPartner(getStripe(), user.id);
    return gate.seal(Response.json(result, { headers: { "Cache-Control": "no-store" } }));
  } catch {
    return gate.seal(Response.json({ error: "payouts" }, { status: 502 }));
  }
}

/** Starts (or resumes) Stripe onboarding and returns the hosted URL. */
export async function POST(req: Request) {
  const gate = await requireSessionUser(req);
  if ("response" in gate) return gate.response;
  const user = gate.user;
  const blocked = guard();
  if (blocked) return gate.seal(Response.json({ error: blocked }, { status: 503 }));
  const body = (await req.json().catch(() => ({}))) as { country?: string };
  const origin = appOrigin(req);
  try {
    const result = await startOnboarding({
      stripe: getStripe(),
      user,
      country: parseCountry(body.country),
      returnUrl: `${origin}/app/account?payouts=return`,
      refreshUrl: `${origin}/app/account?payouts=refresh`,
    });
    return gate.seal(Response.json(result, { headers: { "Cache-Control": "no-store" } }));
  } catch {
    return gate.seal(Response.json({ error: "payouts" }, { status: 502 }));
  }
}
