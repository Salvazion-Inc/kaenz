import { listOwnedYachtListings } from "@/lib/listing-store";
import { cookieValue, readSession, SESSION_COOKIE } from "@/lib/session";
import { listingStatus } from "@/lib/yacht-owner";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await readSession(cookieValue(req.headers.get("cookie"), SESSION_COOKIE));
  if (!user) return Response.json({ error: "auth" }, { status: 401 });
  const rows = await listOwnedYachtListings(user.id);
  return Response.json({
    yachts: rows.map((row) => ({
      id: row.id,
      name: row.name,
      status: listingStatus(row.status),
      homePort: row.homePort,
      photo: row.photos[0] || "",
    })),
  });
}
