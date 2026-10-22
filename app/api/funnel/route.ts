import { funnelRecord, logFunnel } from "@/lib/funnel";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const limited = rateLimit(`funnel:${clientIp(req)}`, 30, 60 * 1000);
  if (!limited.ok) {
    return Response.json(
      { error: "rate" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }
  const body = (await req.json().catch(() => ({}))) as { step?: unknown; role?: unknown };
  const row = funnelRecord(body.step, body.role);
  if (!row) return Response.json({ error: "step" }, { status: 400 });
  logFunnel(row.step, row.role);
  return Response.json({ ok: true });
}
