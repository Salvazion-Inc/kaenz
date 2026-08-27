export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export const defaultHere = { lat: 25.7785, lng: -80.1452, label: "Miami Beach" };

export function etaFromKm(km: number) {
  return Math.max(4, Math.round(km * 2.2));
}

export function formatKm(km: number) {
  if (!Number.isFinite(km)) return "";
  if (km < 1) return `${Math.max(50, Math.round(km * 1000))} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export function sortByGps<T extends { lat: number; lng: number }>(
  items: T[],
  here?: { lat: number; lng: number } | null,
) {
  if (!here) return items;
  return [...items].sort(
    (a, b) => haversineKm(here, a) - haversineKm(here, b),
  );
}

export function nearestPlace<T extends { lat: number; lng: number; city: string }>(
  here: { lat: number; lng: number },
  items: T[],
) {
  if (!items.length) return null;
  return sortByGps(items, here)[0] ?? null;
}

export function mapViewFor(lat: number, lng: number): {
  center: [number, number];
  zoom: number;
} {
  return { center: [lat, lng], zoom: 10 };
}
