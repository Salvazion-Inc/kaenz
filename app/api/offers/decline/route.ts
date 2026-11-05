import { requireVerifiedUser } from "@/lib/account-verification";
import { captainAutoAcceptEnabled } from "@/lib/captain-accept";
import { declineTripOffer, userIsCaptain } from "@/lib/captain-offers";

export const runtime = "nodejs";

function reply(body: Record<string, unknown>, status = 200) {
  return Response.json(
    { autoAccept: captainAutoAcceptEnabled(), ...body },
    { status },
  );
}

export async function POST(req: Request) {
  const gate = await requireVerifiedUser(req);
  if ("response" in gate) return gate.response;
  const captain = await userIsCaptain(gate.user.id);
  if (!captain.ok) return gate.seal(reply({ error: "captain" }, captain.status));
  const body = (await req.json().catch(() => ({}))) as { id?: string };
  const result = await declineTripOffer(String(body.id || ""));
  if ("error" in result) {
    return gate.seal(reply({ error: result.error }, result.status));
  }
  return gate.seal(
    reply({
      id: result.offer.id,
      status: result.offer.status,
      accepted: false,
    }),
  );
}
