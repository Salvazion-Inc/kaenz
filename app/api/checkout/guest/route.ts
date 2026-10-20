import { requireVerifiedUser } from "@/lib/account-verification";

export const runtime = "nodejs";

/** Guest checkout is closed. A verified account books through /api/checkout. */
export async function POST(req: Request) {
  const gate = await requireVerifiedUser(req);
  if ("response" in gate) return gate.response;
  return Response.json(
    { error: "guest", message: "Verifica tu correo" },
    { status: 403 },
  );
}
