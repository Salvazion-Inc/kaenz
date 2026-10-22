import { cookies, headers } from "next/headers";
import { FleetPageClient } from "@/components/pages/FleetPageClient";
import { resolveRequestSession } from "@/lib/account-verification";

export const dynamic = "force-dynamic";

export default async function Page() {
  const jar = await cookies();
  const headerList = await headers();
  const cookie = jar
    .getAll()
    .map((item) => `${item.name}=${encodeURIComponent(item.value)}`)
    .join("; ");
  const reqHeaders = new Headers();
  headerList.forEach((value, key) => reqHeaders.set(key, value));
  if (cookie) reqHeaders.set("cookie", cookie);
  const req = new Request("https://kaenz.com/fleet", { headers: reqHeaders });
  const session = await resolveRequestSession(cookie, req);
  return <FleetPageClient signedIn={Boolean(session.user)} />;
}
