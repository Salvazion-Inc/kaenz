import { cookies } from "next/headers";
import { Suspense } from "react";
import { CheckEmailPage } from "@/components/CheckEmailPage";
import { checkEmailAddress } from "@/lib/check-email";
import { LOCALE_COOKIE, parseLocale } from "@/lib/locale";
import { readSession, SESSION_COOKIE } from "@/lib/session";

export const metadata = { title: "Check your email | Kaenz" };

function CheckEmailFallback() {
  return <CheckEmailPage email="" expired={false} />;
}

async function CheckEmailContent({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; expired?: string }>;
}) {
  const sp = await searchParams;
  const jar = await cookies();
  const session = await readSession(jar.get(SESSION_COOKIE)?.value);
  const query = typeof sp.email === "string" ? sp.email : "";
  return (
    <CheckEmailPage
      email={checkEmailAddress(session?.email, query)}
      expired={sp.expired === "1"}
      locale={parseLocale(jar.get(LOCALE_COOKIE)?.value)}
    />
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; expired?: string }>;
}) {
  return (
    <Suspense fallback={<CheckEmailFallback />}>
      <CheckEmailContent searchParams={searchParams} />
    </Suspense>
  );
}
