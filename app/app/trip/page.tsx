import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { KaenzApp } from "@/components/app/KaenzApp";
import { WithLocale } from "@/components/WithLocale";
import { loginUrl } from "@/lib/form-gate";
import { readSession, SESSION_COOKIE } from "@/lib/session";

export default async function Page() {
  const jar = await cookies();
  const user = await readSession(jar.get(SESSION_COOKIE)?.value);
  if (!user) redirect(loginUrl("/app/trip"));
  return <WithLocale Component={KaenzApp} tab="trip" />;
}
