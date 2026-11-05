import { requireVerifiedUser } from "@/lib/account-verification";
import {
  captainAutoAcceptEnabled,
  offerIsAccepted,
  type StoredOffer,
} from "@/lib/captain-accept";
import { yachtAssigned } from "@/lib/captain-eligibility";
import {
  createTripOffer,
  listVisibleOffers,
  loadOffer,
  userIsCaptain,
} from "@/lib/captain-offers";

export const runtime = "nodejs";

function reply(body: Record<string, unknown>, status = 200) {
  return Response.json(
    { autoAccept: captainAutoAcceptEnabled(), ...body },
    { status },
  );
}

function publicOffer(row: StoredOffer) {
  return {
    id: row.id,
    customerName: row.customerName,
    yachtId: row.yachtId,
    originName: row.originName,
    destName: row.destName,
    guests: row.guests,
    kind: row.kind,
    hours: row.hours,
    status: row.status,
    accepted: offerIsAccepted(row),
  };
}

export async function GET(req: Request) {
  const gate = await requireVerifiedUser(req);
  if ("response" in gate) return gate.response;
  const captain = await userIsCaptain(gate.user.id);
  const id = new URL(req.url).searchParams.get("id")?.trim() || "";
  if (id) {
    const offer = await loadOffer(id);
    const assigned =
      captain.ok && offer ? yachtAssigned(captain.yachts, offer.yachtId) : false;
    const allowed = Boolean(offer) && (offer?.userId === gate.user.id || assigned);
    if (!offer || !allowed) return gate.seal(reply({ accepted: false, id }));
    return gate.seal(
      reply({
        id: offer.id,
        status: offer.status,
        accepted: offerIsAccepted(offer),
        mine: offer.userId === gate.user.id,
        yachtId: offer.yachtId,
      }),
    );
  }
  const offers = await listVisibleOffers(
    gate.user.id,
    captain.ok ? captain.yachts : null,
  );
  return gate.seal(
    reply({
      offers: offers.map((row) => publicOffer(row)),
    }),
  );
}

export async function POST(req: Request) {
  const gate = await requireVerifiedUser(req);
  if ("response" in gate) return gate.response;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const created = await createTripOffer({
    userId: gate.user.id,
    customerName: gate.user.name || "",
    yachtId: String(body.yachtId || ""),
    originName: String(body.originName || body.origin || ""),
    destName: String(body.destName || body.destination || ""),
    guests: body.guests,
    kind: String(body.kind || ""),
    hours: body.hours,
  });
  if ("error" in created) {
    return gate.seal(reply({ error: created.error }, 503));
  }
  return gate.seal(
    reply({ id: created.id, status: created.status, accepted: false }, 201),
  );
}
