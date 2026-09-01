export type LatLng = { lat: number; lng: number };

export const DEMO_ORIGIN_ID = "miami-beach-marina";
export const DEMO_DEST_ID = "island-gardens";

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (2 * (1 - t)) ** 2 / 2;
}

function controlPoint(a: LatLng, b: LatLng): LatLng {
  const mx = (a.lng + b.lng) / 2;
  const my = (a.lat + b.lat) / 2;
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  return { lat: my + dx * 0.22, lng: mx - dy * 0.22 };
}

export function curvePoint(a: LatLng, b: LatLng, t: number): LatLng {
  const c = controlPoint(a, b);
  const u = 1 - t;
  return {
    lat: u * u * a.lat + 2 * u * t * c.lat + t * t * b.lat,
    lng: u * u * a.lng + 2 * u * t * c.lng + t * t * b.lng,
  };
}

export function sampleCurve(a: LatLng, b: LatLng, steps = 36): LatLng[] {
  const out: LatLng[] = [];
  for (let i = 0; i <= steps; i++) out.push(curvePoint(a, b, i / steps));
  return out;
}

export function headingDeg(from: LatLng, to: LatLng) {
  const dy = to.lat - from.lat;
  const dx = (to.lng - from.lng) * Math.cos(((from.lat + to.lat) / 2) * (Math.PI / 180));
  return (Math.atan2(dx, dy) * 180) / Math.PI;
}

export function yachtIconHtml(deg = 0) {
  return `<span class="kaenz-yacht" style="transform:rotate(${deg}deg)">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.2 19 20.5 12 16.4 5 20.5Z"/>
    </svg>
  </span>`;
}

export function minutesLeft(totalMin: number, progress: number) {
  return Math.max(1, Math.round(totalMin * (1 - Math.min(1, Math.max(0, progress)))));
}
