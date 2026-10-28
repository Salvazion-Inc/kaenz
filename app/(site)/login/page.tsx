import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { verificationLinkExpired } from "@/lib/auth-link";
import { googleReasonFromSearch } from "@/lib/google-oauth";

export const metadata = { title: "Log in | Kaenz" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    auth?: string;
    reason?: string;
    error?: string;
    error_code?: string;
    verified?: string;
  }>;
}) {
  const sp = await searchParams;
  const linkError = new URLSearchParams();
  if (sp.error) linkError.set("error", sp.error);
  if (sp.error_code) linkError.set("error_code", sp.error_code);
  if (verificationLinkExpired(linkError)) redirect("/check-email?expired=1");
  return (
    <Suspense>
      <AuthForm mode="login" googleReason={googleReasonFromSearch(sp)} />
    </Suspense>
  );
}
