import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { YachtDetailClient } from "@/components/pages/YachtDetailClient";
import { loginUrl } from "@/lib/form-gate";
import { resolveInventoryYacht } from "@/lib/inventory";
import { readSession, SESSION_COOKIE } from "@/lib/session";
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
  const user = await readSession(jar.get(SESSION_COOKIE)?.value);
  if (yacht.bookable === true && !user) {
    const next = query.checkout
      ? `/fleet/${encodeURIComponent(id)}?checkout=${encodeURIComponent(query.checkout)}`
      : `/fleet/${encodeURIComponent(id)}`;
    redirect(loginUrl(next));
  }
  return (
    <YachtDetailClient
      yacht={yacht}
      canceled={query.checkout === "cancel"}
      signedIn={Boolean(user)}
      accountName={user?.name || ""}
    />
  );
}
