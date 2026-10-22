import { cookies } from "next/headers";
import { Suspense } from "react";
import { CheckEmailPage } from "@/components/CheckEmailPage";
import { checkEmailAddress } from "@/lib/check-email";
import { readSession, SESSION_COOKIE } from "@/lib/session";

export const metadata = { title: "Check your email | Kaenz" };

export default async function Page() {
  const jar = await cookies();
  const session = await readSession(jar.get(SESSION_COOKIE)?.value);
  const address = checkEmailAddress(session?.email);
  return (
    <Suspense>
      <CheckEmailPage email={address} />
    </Suspense>
  );
}
