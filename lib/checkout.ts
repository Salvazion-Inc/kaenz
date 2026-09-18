import type Stripe from "stripe";
import { bookingFromCharge, insertBooking, updateBooking } from "./booking-store";
import {
  defaultDestinationId,
  isSeedRealId,
} from "./bookable-seed";
import { parseLocale } from "./locale";
import {
  appOrigin,
  chargeToMetadata,
  getStripe,
  stripeConfigured,
} from "./stripe";
import { parseWhenMode, quoteTrip } from "./trip-quote";

export type CheckoutBody = {
  yachtId?: string;
  yacht_slug?: string;
  kind?: string;
  trip_kind?: string;
  hours?: number;
  guests?: number;
  date?: string;
  trip_date?: string;
  time?: string;
  trip_time?: string;
  whenMode?: string;
  originId?: string;
  destinationId?: string;
  origin?: string;
  destination?: string;
  gratuityPct?: number;
  email?: string;
  full_name?: string;
  name?: string;
  phone?: string;
  locale?: string;
  guest?: boolean;
  /** Ignored. Fare is quoted server-side from yacht/kind/hours. */
  amount?: unknown;
  price?: unknown;
  total?: unknown;
  unit_amount?: unknown;
  fare?: unknown;
};

function kindLabel(kind: string) {
  if (kind === "commute") return "Commute";
  if (kind === "special") return "Special Occasion";
  return "Tour";
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function randLetters(n: number) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < n; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export async function createTripCheckout(opts: {
  req: Request;
  body: CheckoutBody;
  user?: { id: string; email?: string; name?: string } | null;
  guest?: boolean;
}) {
  if (!stripeConfigured()) {
    return { error: "stripe_unconfigured" as const, status: 503 };
  }

  const guest = Boolean(opts.guest || !opts.user);
  const yachtId = String(opts.body.yachtId || opts.body.yacht_slug || "").trim();
  if (!yachtId) {
    return { error: "yacht" as const, status: 400 };
  }
  const kind = opts.body.kind || opts.body.trip_kind;
  // Fare is quoted from inventory + kind + hours. Client amount/price/total are ignored.
  void opts.body.amount;
  void opts.body.price;
  void opts.body.total;
  void opts.body.unit_amount;
  void opts.body.fare;
  const quotedProbe = await quoteTrip({
    yachtId,
    kind: kind as "commute" | "tour" | "special",
    hours: Number(opts.body.hours),
    guests: Number(opts.body.guests),
    date: String(opts.body.date || opts.body.trip_date || ""),
    whenMode: parseWhenMode(opts.body.whenMode),
    originId: String(opts.body.originId || ""),
    destinationId: String(opts.body.destinationId || ""),
    gratuityPct: Number(opts.body.gratuityPct || 0),
  });

  let quoted = quotedProbe;
  if ("error" in quoted && quoted.error === "yacht") {
    return { error: "yacht" as const, status: 400 };
  }
  if ("error" in quoted) {
    return { error: quoted.error, status: 400 };
  }

  if (guest && quoted.yacht.bookable !== true && !isSeedRealId(quoted.yacht.id)) {
    return { error: "yacht" as const, status: 400 };
  }

  const originId =
    String(opts.body.originId || "").trim() || quoted.yacht.marinaId;
  const destinationId =
    String(opts.body.destinationId || "").trim() ||
    defaultDestinationId(quoted.yacht, quoted.kind);

  if (originId !== opts.body.originId || destinationId !== opts.body.destinationId) {
    quoted = await quoteTrip({
      yachtId: quoted.yacht.id,
      kind: quoted.kind,
      hours: quoted.hours,
      guests: quoted.guests,
      date: String(opts.body.date || opts.body.trip_date || ""),
      whenMode: parseWhenMode(opts.body.whenMode),
      originId,
      destinationId,
      gratuityPct: Number(opts.body.gratuityPct || 0),
    });
    if ("error" in quoted) {
      return { error: quoted.error, status: 400 };
    }
  }

  const email = String(opts.body.email || opts.user?.email || "")
    .trim()
    .toLowerCase();
  const fullName = String(
    opts.body.full_name || opts.body.name || opts.user?.name || "",
  ).trim();
  if (!isEmail(email) || fullName.length < 2) {
    return { error: "profile" as const, status: 400 };
  }

  const { yacht, origin, destination, charge, kind: tripKind, hours, guests } =
    quoted;
  const originName = origin?.name || String(opts.body.origin || yacht.marina);
  const destinationName =
    destination?.name || String(opts.body.destination || originName);
  const locale = parseLocale(opts.body.locale);
  const bookingId = crypto.randomUUID();
  const transferGroup = `kaenz_${bookingId}`;

  await insertBooking(
    bookingFromCharge(charge, {
      id: bookingId,
      full_name: fullName,
      email,
      phone: String(opts.body.phone || ""),
      yacht_slug: yacht.id,
      origin: originName,
      destination: destinationName,
      trip_date: String(opts.body.date || opts.body.trip_date || "") || null,
      trip_time: String(opts.body.time || opts.body.trip_time || ""),
      guests,
      notes: JSON.stringify({
        kind: tripKind,
        hours,
        whenMode: opts.body.whenMode,
        market: quoted.quote.marketName,
        split: chargeToMetadata(charge),
        guest,
        source: yacht.source || "catalog",
      }),
      locale,
      status: "checkout",
      trip_kind: tripKind,
      user_id: opts.user?.id || "",
      transfer_group: transferGroup,
    }),
  ).catch(() => undefined);

  const originUrl = appOrigin(opts.req);
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
          name: `Kaenz ${kindLabel(tripKind)} · ${yacht.name}`,
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

  const successUrl = guest
    ? `${originUrl}/book/confirmed?session_id={CHECKOUT_SESSION_ID}`
    : `${originUrl}/app/trip?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = guest
    ? `${originUrl}/fleet/${encodeURIComponent(yacht.id)}?checkout=cancel`
    : `${originUrl}/app/trip?checkout=cancel`;

  const sessionParams = {
    mode: "payment" as const,
    customer_email: email,
    client_reference_id: bookingId,
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: lineItems,
    metadata: {
      booking_id: bookingId,
      yacht_id: yacht.id,
      yacht_name: yacht.name,
      kind: tripKind,
      hours: String(hours),
      guests: String(guests),
      guest: guest ? "1" : "0",
      ...chargeToMetadata(charge),
    },
    payment_intent_data: {
      transfer_group: transferGroup,
      description: `Kaenz ${kindLabel(tripKind)} · ${yacht.name}`,
      metadata: {
        booking_id: bookingId,
        yacht_id: yacht.id,
        kind: tripKind,
      },
    },
  };
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      ...sessionParams,
      integration_identifier: `kaenzgst${randLetters(8)}`,
    } as Stripe.Checkout.SessionCreateParams);
  } catch {
    try {
      session = await stripe.checkout.sessions.create(sessionParams);
    } catch {
      return { error: "checkout" as const, status: 502 };
    }
  }

  await updateBooking(bookingId, {
    stripe_session_id: session.id,
    status: "checkout",
  }).catch(() => undefined);

  return {
    id: bookingId,
    sessionId: session.id,
    url: session.url,
    amount: charge.total,
    yachtId: yacht.id,
    yachtName: yacht.name,
    kind: tripKind,
    hours,
    guests,
  };
}
