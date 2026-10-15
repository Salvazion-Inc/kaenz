import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { googleReasonFromSearch } from "@/lib/google-oauth";
import { readSession, SESSION_COOKIE } from "@/lib/session";

export const metadata = { title: "Log in | Kaenz" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; auth?: string; reason?: string; error?: string }>;
}) {
  const jar = await cookies();
  const user = await readSession(jar.get(SESSION_COOKIE)?.value);
  if (user) redirect("/app");
  const sp = await searchParams;
  return (
    <Suspense>
      <AuthForm mode="login" googleReason={googleReasonFromSearch(sp)} />
    </Suspense>
  );
}
