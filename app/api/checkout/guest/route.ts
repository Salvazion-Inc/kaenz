import { createTripCheckout, type CheckoutBody } from "@/lib/checkout";
import { publicErrorCode } from "@/lib/public-error";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const limited = rateLimit(`guest-checkout:${clientIp(req)}`, 8, 10 * 60 * 1000);
  if (!limited.ok) {
    return Response.json(
      { error: "rate" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  const raw = await req.json().catch(() => null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return Response.json({ error: "fields" }, { status: 400 });
  }
  const body = raw as CheckoutBody;
  const yachtId = String(body.yachtId || body.yacht_slug || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.full_name || body.name || "").trim();
  if (!yachtId) {
    return Response.json({ error: "yacht" }, { status: 400 });
  }
  if (!EMAIL.test(email) || name.length < 2) {
    return Response.json({ error: "profile" }, { status: 400 });
  }

  const result = await createTripCheckout({
    req,
    body: {
      yachtId,
      kind: body.kind || body.trip_kind,
      hours: body.hours,
      guests: body.guests,
      date: body.date || body.trip_date,
      time: body.time || body.trip_time,
      whenMode: body.whenMode,
      originId: body.originId,
      destinationId: body.destinationId,
      origin: body.origin,
      destination: body.destination,
      gratuityPct: body.gratuityPct,
      email,
      full_name: name,
      phone: body.phone,
      locale: body.locale,
      guest: true,
    },
    user: null,
    guest: true,
  });
  if ("error" in result) {
    return Response.json(
      { error: publicErrorCode(result.error) },
      { status: result.status },
    );
  }
  return Response.json({
    url: result.url,
    sessionId: result.sessionId,
    yachtId: result.yachtId,
    kind: result.kind,
    hours: result.hours,
  });
}
