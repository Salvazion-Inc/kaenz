import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { YachtDetailClient } from "@/components/pages/YachtDetailClient";
import { resolveRequestSession } from "@/lib/account-verification";
import { fleetAccess } from "@/lib/fleet-access";
import { resolveInventoryYacht } from "@/lib/inventory";
import { loadBookingContact } from "@/lib/profile";
import { yachts } from "@/lib/yachts";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export function generateStaticParams() {
  return yachts.map((y) => ({ id: y.id }));
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const yacht = await resolveInventoryYacht(id);
  if (!yacht) notFound();

  const jar = await cookies();
  const headerList = await headers();
  const cookie = jar
    .getAll()
    .map((item) => `${item.name}=${encodeURIComponent(item.value)}`)
    .join("; ");
  const reqHeaders = new Headers();
  headerList.forEach((value, key) => reqHeaders.set(key, value));
  if (cookie) reqHeaders.set("cookie", cookie);
  const req = new Request(`https://kaenz.com/fleet/${id}`, { headers: reqHeaders });
  const session = await resolveRequestSession(cookie, req);
  const access = fleetAccess(session.user, session.verified);
  const contact = session.user ? await loadBookingContact(cookie, session.user) : null;
  const viewer = session.user
    ? {
        name: contact?.fullName || session.user.name,
        email: contact?.email || session.user.email,
      }
    : null;

  return (
    <YachtDetailClient
      yacht={yacht}
      canceled={query.checkout === "cancel"}
      viewer={viewer}
      access={access}
      contact={access === "verified" ? contact : null}
    />
  );
}
