import Stripe from "stripe";
import { updateBooking } from "@/lib/booking-store";
import {
  getStripe,
  payoutAccountsFromEnv,
  stripeConfigured,
  transferTripShares,
} from "@/lib/stripe";
import { settleCharge } from "@/lib/pricing";

export const runtime = "nodejs";

function chargeFromMetadata(meta: Stripe.Metadata | null | undefined) {
  const fare = Number(meta?.fare || 0);
  const owner = Number(meta?.owner || 0);
  const captain = Number(meta?.captain || 0);
  const platform = Number(meta?.platform || 0);
  const origin = Number(meta?.marina_pickup || 0);
  const destination = Number(meta?.marina_dropoff || 0);
  return settleCharge(
    {
      total: fare,
      owner,
      captain,
      platform,
      marina: {
        roundTrip: destination === 0 && origin > 0,
        origin,
        destination,
        total: origin + destination,
      },
    },
    Number(meta?.gratuity_pct || 0),
  );
}

async function fulfill(session: Stripe.Checkout.Session) {
  const bookingId =
    session.client_reference_id || session.metadata?.booking_id || "";
  if (!bookingId) return;
  const paymentIntent =
    typeof session.payment_intent === "string" ? session.payment_intent : "";
  await updateBooking(bookingId, {
    status: "paid",
    stripe_session_id: session.id,
    stripe_payment_intent: paymentIntent,
    payment_method: "stripe",
    amount: session.amount_total ? session.amount_total / 100 : undefined,
  });

  if (session.payment_status !== "paid") return;
  const charge = chargeFromMetadata(session.metadata);
  const accounts = payoutAccountsFromEnv();
  const hasAny =
    accounts.owner ||
    accounts.captain ||
    accounts.marinaPickup ||
    accounts.marinaDropoff;
  if (!hasAny) return;
  try {
    const payouts = await transferTripShares({
      stripe: getStripe(),
      charge,
      transferGroup: `kaenz_${bookingId}`,
      bookingId,
      accounts,
    });
    await updateBooking(bookingId, { payouts, status: "paid" });
  } catch {
    /* booking is already paid; payouts can be retried */
  }
}

export async function POST(req: Request) {
  if (!stripeConfigured()) {
    return Response.json({ error: "stripe_unconfigured" }, { status: 503 });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ error: "webhook_unconfigured" }, { status: 503 });
  }
  const raw = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return Response.json({ error: "signature" }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, secret);
  } catch {
    return Response.json({ error: "webhook" }, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    await fulfill(event.data.object as Stripe.Checkout.Session);
  }

  return Response.json({ received: true });
}
