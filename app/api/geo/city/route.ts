import { nearestPlace } from "@/lib/geo";
import { places } from "@/lib/places";

export const runtime = "nodejs";

const cache = new Map<string, { city: string; at: number }>();
const TTL = 6 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json({ error: "coords" }, { status: 400 });
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return Response.json({ error: "coords" }, { status: 400 });
  }

  const near = nearestPlace({ lat, lng }, places);
  const fallback = near?.city || "";
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) {
    return Response.json({ city: hit.city || fallback, lat, lng, cached: true });
  }

  let city = fallback;
  try {
    const geo = new URL("https://nominatim.openstreetmap.org/reverse");
    geo.searchParams.set("lat", String(lat));
    geo.searchParams.set("lon", String(lng));
    geo.searchParams.set("format", "jsonv2");
    geo.searchParams.set("zoom", "10");
    geo.searchParams.set("addressdetails", "1");
    const res = await fetch(geo, {
      headers: {
        "User-Agent": "Kaenz/1.0 (https://kaenz.com; info@salvazion.org)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        address?: Record<string, string>;
      };
      const addr = data.address || {};
      city =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.municipality ||
        addr.county ||
        fallback;
    }
  } catch {
    city = fallback;
  }

  cache.set(key, { city, at: Date.now() });
  if (cache.size > 200) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  return Response.json({ city, lat, lng });
}
