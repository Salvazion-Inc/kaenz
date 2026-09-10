import { createTripCheckout, type CheckoutBody } from "@/lib/checkout";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as CheckoutBody;
  const result = await createTripCheckout({
    req,
    body,
    user: null,
    guest: true,
  });
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json(result);
}
