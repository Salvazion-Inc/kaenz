import { readApiSession } from "@/lib/account-verification";
import { parseCountry, refreshPartner, startOnboarding } from "@/lib/payouts";
import { appOrigin, getStripe, stripeConfigured } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Payout onboarding binds a Stripe account to a Kaenz session user id. That is
 * only safe when sessions are signed with a private AUTH_SECRET. Production
 * refuses to sign without that variable. Fail closed here when it is unset.
 */
function guard() {
  if (!process.env.AUTH_SECRET) return "auth_secret";
  if (!stripeConfigured()) return "stripe_unconfigured";
  if (!getSupabaseAdmin()) return "supabase";
  return "";
}

async function sessionUser(req: Request) {
  return readApiSession(req);
}

/** Current payout status; releases retained shares once the account is active. */
export async function GET(req: Request) {
  const user = await sessionUser(req);
  if (!user) return Response.json({ error: "auth" }, { status: 401 });
  const blocked = guard();
  if (blocked) {
    return Response.json({ status: "unavailable", reason: blocked, pendingCents: 0 });
  }
  try {
    const result = await refreshPartner(getStripe(), user.id);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "payouts" }, { status: 502 });
  }
}

/** Starts (or resumes) Stripe onboarding and returns the hosted URL. */
export async function POST(req: Request) {
  const user = await sessionUser(req);
  if (!user) return Response.json({ error: "auth" }, { status: 401 });
  const blocked = guard();
  if (blocked) return Response.json({ error: blocked }, { status: 503 });
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
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "payouts" }, { status: 502 });
  }
}
