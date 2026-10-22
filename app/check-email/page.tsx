import { cookies } from "next/headers";
import { Suspense } from "react";
import { CheckEmailPage } from "@/components/CheckEmailPage";
import { CHECK_EMAIL_COOKIE, readCheckEmail } from "@/lib/check-email";
import { LOCALE_COOKIE, parseLocale } from "@/lib/locale";

export const metadata = { title: "Check your email | Kaenz" };

function CheckEmailFallback() {
  return <CheckEmailPage email="" expired={false} invalid={false} />;
}

async function CheckEmailContent({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string; invalid?: string }>;
}) {
  const sp = await searchParams;
  const jar = await cookies();
  return (
    <CheckEmailPage
      email={await readCheckEmail(jar.get(CHECK_EMAIL_COOKIE)?.value)}
      expired={sp.expired === "1"}
      invalid={sp.invalid === "1"}
      locale={parseLocale(jar.get(LOCALE_COOKIE)?.value)}
    />
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string; invalid?: string }>;
}) {
  return (
    <Suspense fallback={<CheckEmailFallback />}>
      <CheckEmailContent searchParams={searchParams} />
    </Suspense>
  );
}
