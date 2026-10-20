import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { KaenzApp } from "@/components/app/KaenzApp";
import { WithLocale } from "@/components/WithLocale";
import { loginUrl } from "@/lib/form-gate";
import { readSession, SESSION_COOKIE } from "@/lib/session";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ add?: string | string[] }>;
}) {
  const sp = await searchParams;
  const add = Array.isArray(sp.add) ? sp.add[0] : sp.add;
  const next =
    add === "marina" || add === "port" ? `/app?add=${add}` : add ? `/app?add=${add}` : "/app";
  const jar = await cookies();
  const user = await readSession(jar.get(SESSION_COOKIE)?.value);
  if (!user) redirect(loginUrl(next));
  return <WithLocale Component={KaenzApp} tab="places" />;
}
