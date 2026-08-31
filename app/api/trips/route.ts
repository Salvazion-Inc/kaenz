import {
  cookieValue,
  readSession,
  readSignedValue,
  SESSION_COOKIE,
  signValue,
} from "@/lib/session";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

const TRIPS_COOKIE = "kaenz_trips";
const DAY = 60 * 60 * 24;

type StoredTrip = {
  id: string;
  date: string;
  time: string;
  kind: string;
  yachtId: string;
  yachtName: string;
  yachtImage: string;
  origin: string;
  destination: string;
  guests: number;
  hours: number;
  status: "requested" | "confirmed";
};

async function readTripMap(token: string | undefined | null) {
  const raw = await readSignedValue(token);
  if (!raw) return {} as Record<string, StoredTrip[]>;
  try {
    const data = JSON.parse(raw) as { trips?: Record<string, StoredTrip[]> };
    return data.trips && typeof data.trips === "object" ? data.trips : {};
  } catch {
    return {};
  }
}

function tripsCookie(token: string) {
  return `${TRIPS_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${400 * DAY}`;
}

function asTrip(value: unknown): StoredTrip | null {
  if (!value || typeof value !== "object") return null;
  const t = value as StoredTrip;
  if (!t.id || !t.date || !t.yachtName) return null;
  return {
    id: String(t.id),
    date: String(t.date),
    time: String(t.time || ""),
    kind: String(t.kind || "tour"),
    yachtId: String(t.yachtId || ""),
    yachtName: String(t.yachtName),
    yachtImage: String(t.yachtImage || ""),
    origin: String(t.origin || ""),
    destination: String(t.destination || ""),
    guests: Number(t.guests) || 1,
    hours: Number(t.hours) || 1,
    status: t.status === "requested" ? "requested" : "confirmed",
  };
}

export async function GET(req: Request) {
  const user = await readSession(
    cookieValue(req.headers.get("cookie"), SESSION_COOKIE),
  );
  if (!user) return Response.json({ error: "auth" }, { status: 401 });

  const map = await readTripMap(cookieValue(req.headers.get("cookie"), TRIPS_COOKIE));
  const local = map[user.id] || [];
  const byId = new Map(local.map((t) => [t.id, t]));

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data } = await supabase
        .from("bookings")
        .select(
          "id, trip_date, trip_time, trip_kind, yacht_slug, origin, destination, guests, status, notes",
        )
        .eq("email", user.email)
        .order("trip_date", { ascending: false })
        .limit(50);
      for (const row of data || []) {
        const id = String(row.id);
        if (byId.has(id)) continue;
        byId.set(id, {
          id,
          date: String(row.trip_date || ""),
          time: String(row.trip_time || ""),
          kind: String(row.trip_kind || "tour"),
          yachtId: String(row.yacht_slug || ""),
          yachtName: String(row.yacht_slug || "Yacht"),
          yachtImage: "",
          origin: String(row.origin || ""),
          destination: String(row.destination || ""),
          guests: Number(row.guests) || 1,
          hours: 1,
          status: row.status === "confirmed" ? "confirmed" : "requested",
        });
      }
    } catch {
      /* cookie trips still work */
    }
  }

  return Response.json({
    trips: [...byId.values()].map((t) => ({ ...t, photos: [] })),
  });
}

export async function POST(req: Request) {
  const user = await readSession(
    cookieValue(req.headers.get("cookie"), SESSION_COOKIE),
  );
  if (!user) return Response.json({ error: "auth" }, { status: 401 });
  const trip = asTrip(await req.json().catch(() => null));
  if (!trip) return Response.json({ error: "trip" }, { status: 400 });

  const map = await readTripMap(cookieValue(req.headers.get("cookie"), TRIPS_COOKIE));
  const list = map[user.id] || [];
  map[user.id] = [trip, ...list.filter((item) => item.id !== trip.id)].slice(0, 50);
  const token = await signValue(JSON.stringify({ trips: map }));
  const res = Response.json({ trip: { ...trip, photos: [] } });
  res.headers.append("Set-Cookie", tripsCookie(token));
  return res;
}
