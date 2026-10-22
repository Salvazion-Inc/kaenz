const hits = new Map<string, number[]>();

export function clientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const ip =
    forwarded.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  return ip.slice(0, 128);
}

/** Sliding-window limiter. Best-effort per instance (Vercel/serverless). */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((at) => now - at < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    const retryAfterSec = Math.max(
      1,
      Math.ceil((recent[0] + windowMs - now) / 1000),
    );
    return { ok: false as const, retryAfterSec };
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 4000) {
    for (const [id, times] of hits) {
      if (!times.some((at) => now - at < windowMs)) hits.delete(id);
    }
  }
  return { ok: true as const, retryAfterSec: 0 };
}
