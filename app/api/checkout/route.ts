import { cookieValue, readSession, SESSION_COOKIE } from "@/lib/session";
import { bookingFromCharge, insertBooking, updateBooking } from "@/lib/booking-store";
import { parseLocale } from "@/lib/locale";
import {
  appOrigin,
  chargeToMetadata,
  getStripe,
  stripeConfigured,
} from "@/lib/stripe";
import { quoteTrip } from "@/lib/trip-quote";

export const runtime = "nodejs";

function kindLabel(kind: string) {
  if (kind === "commute") return "Commute";
  if (kind === "special") return "Special Occasion";
  return "Tour";
}

export async function POST(req: Request) {
  if (!stripeConfigured()) {
    return Response.json({ error: "stripe_unconfigured" }, { status: 503 });
  }

  const user = await readSession(
    cookieValue(req.headers.get("cookie"), SESSION_COOKIE),
  );
  const body = await req.json().catch(() => ({}));
  const quoted = await quoteTrip({
    yachtId: String(body.yachtId || body.yacht_slug || ""),
    kind: body.kind || body.trip_kind,
    hours: Number(body.hours),
    guests: Number(body.guests),
    date: String(body.date || body.trip_date || ""),
    whenMode: body.whenMode,
    originId: String(body.originId || ""),
    destinationId: String(body.destinationId || ""),
    gratuityPct: Number(body.gratuityPct || 0),
  });
  if ("error" in quoted) {
    return Response.json({ error: quoted.error }, { status: 400 });
  }

  const email = String(body.email || user?.email || "").trim();
  const fullName = String(body.full_name || body.name || user?.name || "").trim();
  if (!email || !fullName) {
    return Response.json({ error: "profile" }, { status: 400 });
  }

  const { yacht, origin, destination, charge, kind, hours, guests } = quoted;
  const originName = origin?.name || String(body.origin || "");
  const destinationName = destination?.name || String(body.destination || "");
  const locale = parseLocale(body.locale);
  const bookingId = crypto.randomUUID();
  const transferGroup = `kaenz_${bookingId}`;

  await insertBooking(
    bookingFromCharge(charge, {
      id: bookingId,
      full_name: fullName,
      email,
      phone: String(body.phone || ""),
      yacht_slug: yacht.id,
      origin: originName,
      destination: destinationName,
      trip_date: String(body.date || body.trip_date || "") || null,
      trip_time: String(body.time || body.trip_time || ""),
      guests,
      notes: JSON.stringify({
        kind,
        hours,
        whenMode: body.whenMode,
        market: quoted.quote.marketName,
        split: chargeToMetadata(charge),
      }),
      locale,
      status: "checkout",
      trip_kind: kind,
      user_id: user?.id || "",
      transfer_group: transferGroup,
    }),
  ).catch(() => undefined);

  const originUrl = appOrigin(req);
  const stripe = getStripe();
  const lineItems: {
    quantity: number;
    price_data: {
      currency: "usd";
      unit_amount: number;
      product_data: { name: string; description?: string };
    };
  }[] = [
    {
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: charge.fareCents,
        product_data: {
          name: `Kaenz ${kindLabel(kind)} · ${yacht.name}`,
          description: `${originName} → ${destinationName} · ${hours}h · ${guests} guests`,
        },
      },
    },
  ];
  if (charge.gratuityCents > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: charge.gratuityCents,
        product_data: {
          name: `Captain gratuity (${charge.gratuityPct}%)`,
          description: "Optional. Paid in full to the captain.",
        },
      },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    client_reference_id: bookingId,
    success_url: `${originUrl}/app/trip?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${originUrl}/app/trip?checkout=cancel`,
    line_items: lineItems,
    metadata: {
      booking_id: bookingId,
      yacht_id: yacht.id,
      kind,
      ...chargeToMetadata(charge),
    },
    payment_intent_data: {
      transfer_group: transferGroup,
      description: `Kaenz ${kindLabel(kind)} · ${yacht.name}`,
      metadata: {
        booking_id: bookingId,
        yacht_id: yacht.id,
        kind,
      },
    },
  });

  await updateBooking(bookingId, {
    stripe_session_id: session.id,
    status: "checkout",
  }).catch(() => undefined);

  return Response.json({
    id: bookingId,
    sessionId: session.id,
    url: session.url,
    amount: charge.total,
    split: chargeToMetadata(charge),
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
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  const paid =
    session.payment_status === "paid" || session.status === "complete";
  return Response.json({
    paid,
    status: session.status,
    paymentStatus: session.payment_status,
    bookingId: session.client_reference_id || session.metadata?.booking_id || "",
    sessionId: session.id,
    paymentIntent:
      typeof session.payment_intent === "string" ? session.payment_intent : "",
    amount: session.amount_total ? session.amount_total / 100 : 0,
    split: session.metadata || {},
  });
}
