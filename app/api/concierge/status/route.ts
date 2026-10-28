import { conciergeEnabled } from "@/lib/concierge";

export const runtime = "nodejs";

/** Boolean only. The concierge key is never included. */
export function GET() {
  return Response.json({ enabled: conciergeEnabled() });
}
