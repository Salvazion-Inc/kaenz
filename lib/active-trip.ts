export type BookingTrip = {
  id?: string;
  date?: string;
  time?: string;
  origin?: string;
  destination?: string;
  status?: string;
};

const ACTIVE = new Set(["requested", "confirmed", "approved", "waiting", "underway"]);

function localDate(now: Date) {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** A stored booking for today. Never synthesizes a route. */
export function selectActiveTrip(
  trips: BookingTrip[] | null | undefined,
  now = new Date(),
): { origin: string; destination: string } | null {
  const today = localDate(now);
  const matches = (trips || []).filter((trip) => {
    const origin = String(trip.origin || "").trim();
    const destination = String(trip.destination || "").trim();
    const date = String(trip.date || "").slice(0, 10);
    return (
      Boolean(trip.id) &&
      Boolean(origin) &&
      Boolean(destination) &&
      ACTIVE.has(String(trip.status || "")) &&
      date === today
    );
  });
  if (!matches.length) return null;
  matches.sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));
  const trip = matches[matches.length - 1];
  return {
    origin: String(trip.origin).trim(),
    destination: String(trip.destination).trim(),
  };
}
