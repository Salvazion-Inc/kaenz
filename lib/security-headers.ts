/**
 * Baseline for every Kaenz response.
 * CSP allows the app, Vercel Analytics, Stripe Checkout, and map tiles.
 * Geolocation stays on for the marina locator. Camera and microphone stay off.
 */
export const SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://vitals.vercel-insights.com https://*.supabase.co wss://*.supabase.co",
      "frame-src 'self' https://checkout.stripe.com https://*.stripe.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://checkout.stripe.com https://*.stripe.com",
      "object-src 'none'",
      "worker-src 'self' blob:",
    ].join("; "),
  },
];

export const STATIC_ASSET_CACHE =
  "public, max-age=86400, stale-while-revalidate=604800";

export const PUBLIC_CATALOG_CACHE =
  "public, s-maxage=60, stale-while-revalidate=300";

export function applySecurityHeaders<
  T extends { headers: { set: (name: string, value: string) => void } },
>(res: T): T {
  for (const header of SECURITY_HEADERS) {
    res.headers.set(header.key, header.value);
  }
  return res;
}
