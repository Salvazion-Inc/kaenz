import { cookieValue, readSession, SESSION_COOKIE } from "@/lib/session";
import { createTripCheckout, type CheckoutBody } from "@/lib/checkout";
import { publicErrorCode } from "@/lib/public-error";
import { getStripe, maskStripeId, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await readSession(
    cookieValue(req.headers.get("cookie"), SESSION_COOKIE),
  );
  const body = (await req.json().catch(() => ({}))) as CheckoutBody;
  const result = await createTripCheckout({
    req,
    body,
    user,
    guest: !user,
  });
  if ("error" in result) {
    return Response.json(
      { error: publicErrorCode(result.error) },
      { status: result.status },
    );
  }
  return Response.json({
    id: result.id,
    url: result.url,
    sessionId: result.sessionId,
    yachtId: result.yachtId,
    kind: result.kind,
    hours: result.hours,
  });
}

export async function GET(req: Request) {
  if (!stripeConfigured()) {
    return Response.json({ error: "stripe_unconfigured" }, { status: 503 });
  }
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id") || "";
  if (!sessionId.startsWith("cs_")) {
    return Response.json({ error: "session" }, { status: 400 });
  }
  let session;
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId);
  } catch {
    return Response.json({ error: "session" }, { status: 404 });
  }
  const paid =
    session.payment_status === "paid" ||
    (session.status === "complete" && session.payment_status !== "unpaid");
  const meta = session.metadata || {};
  return Response.json({
    paid,
    status: session.status,
    paymentStatus: session.payment_status,
    bookingId: session.client_reference_id || meta.booking_id || "",
    sessionId: maskStripeId(session.id),
    paymentIntent:
      typeof session.payment_intent === "string" ? session.payment_intent : "",
    amount: session.amount_total ? session.amount_total / 100 : 0,
    currency: session.currency || "usd",
    email: session.customer_email || session.customer_details?.email || "",
    yachtId: meta.yacht_id || "",
    yachtName: meta.yacht_name || "",
    kind: meta.kind || "",
    hours: meta.hours ? Number(meta.hours) : null,
    guests: meta.guests ? Number(meta.guests) : null,
  });
}
