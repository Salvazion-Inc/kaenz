import Stripe from "stripe";
import { updateBooking } from "@/lib/booking-store";
import { refreshByAccountId, resolveTripPartners } from "@/lib/payouts";
import { getStripe, stripeConfigured, transferTripShares } from "@/lib/stripe";
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
  if (session.payment_status === "unpaid") return;
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
  const stripe = getStripe();
  try {
    // source_transaction ties each transfer to this trip's charge, so partner
    // transfers never draw on unrelated platform balance.
    let sourceCharge = "";
    if (paymentIntent) {
      const pi = await stripe.paymentIntents.retrieve(paymentIntent);
      sourceCharge =
        typeof pi.latest_charge === "string"
          ? pi.latest_charge
          : pi.latest_charge?.id || "";
    }
    const partners = await resolveTripPartners({
      yachtId: String(session.metadata?.yacht_id || ""),
      originId: String(session.metadata?.origin_id || ""),
      destinationId: String(session.metadata?.destination_id || ""),
    });
    const payouts = await transferTripShares({
      stripe,
      charge,
      transferGroup: `kaenz_${bookingId}`,
      bookingId,
      sourceCharge,
      partners,
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
  if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId =
      session.client_reference_id || session.metadata?.booking_id || "";
    if (bookingId) {
      await updateBooking(bookingId, { status: "failed" }).catch(() => undefined);
    }
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    await refreshByAccountId(getStripe(), account.id).catch(() => undefined);
  }

  return Response.json({ received: true });
}
