import type { Place } from "./places";

/** Satellite still of the actual coordinates (Esri World Imagery). */
export function aerialPhotoUrl(lat: number, lng: number) {
  const dLat = 0.0035;
  const dLng = 0.005;
  const bbox = [lng - dLng, lat - dLat, lng + dLng, lat + dLat].join(",");
  const params = new URLSearchParams({
    bbox,
    bboxSR: "4326",
    imageSR: "4326",
    size: "800,450",
    format: "jpg",
    f: "image",
  });
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?${params.toString()}`;
}

export function placePhoto(place: Place) {
  const src = place.image || "";
  if (src.startsWith("/featured/")) return src;
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  if (Number.isFinite(place.lat) && Number.isFinite(place.lng)) {
    return aerialPhotoUrl(place.lat, place.lng);
  }
  return src;
}

export function formatCoords(lat: number, lng: number) {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}° ${ns}, ${Math.abs(lng).toFixed(4)}° ${ew}`;
}
