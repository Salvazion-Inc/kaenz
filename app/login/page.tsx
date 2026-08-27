import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { googleReasonFromSearch } from "@/lib/google-oauth";

export const metadata = { title: "Log in | Kaenz" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; auth?: string; reason?: string; error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <Suspense>
      <AuthForm mode="login" googleReason={googleReasonFromSearch(sp)} />
    </Suspense>
  );
}
