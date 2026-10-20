import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppSplash } from "@/components/app/AppSplash";
import { VerifyEmailScreen } from "@/components/VerifyEmailScreen";
import { resolveRequestSession } from "@/lib/account-verification";
import {
  AccountPrefsProvider,
  APPLY_LOOK_SCRIPT,
} from "@/lib/account-prefs";
import { ProfileProvider } from "@/lib/profile-store";
import { SelfieProvider } from "@/lib/selfie-store";
import { DispatchProvider } from "@/lib/dispatch-store";
import { OperatorProvider } from "@/lib/operator-store";
import { TripLogProvider } from "@/lib/trip-log";
import { TripProvider } from "@/lib/trip-store";

export const metadata = {
  title: "Kaenz App",
  alternates: {
    canonical: "https://kaenz.com/app",
    languages: {
      en: "https://kaenz.com/app",
      es: "https://kaenz.com/app",
      fr: "https://kaenz.com/app",
      it: "https://kaenz.com/app",
      pt: "https://kaenz.com/app",
      "x-default": "https://kaenz.com/app",
    },
  },
  appleWebApp: {
    capable: true,
    title: "Kaenz",
    statusBarStyle: "black-translucent" as const,
  },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const headerList = await headers();
  const cookie = jar
    .getAll()
    .map((item) => `${item.name}=${encodeURIComponent(item.value)}`)
    .join("; ");
  const reqHeaders = new Headers();
  headerList.forEach((value, key) => reqHeaders.set(key, value));
  if (cookie) reqHeaders.set("cookie", cookie);
  const req = new Request("https://kaenz.com/app", { headers: reqHeaders });
  const session = await resolveRequestSession(cookie, req);
  if (!session.user) redirect("/login?next=/app");
  if (!session.verified) return <VerifyEmailScreen email={session.user.email} />;
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: APPLY_LOOK_SCRIPT }} />
      <TripProvider>
        <ProfileProvider>
          <AccountPrefsProvider>
            <TripLogProvider>
              <OperatorProvider>
                <DispatchProvider>
                  <SelfieProvider>
                    <AppSplash>{children}</AppSplash>
                  </SelfieProvider>
                </DispatchProvider>
              </OperatorProvider>
            </TripLogProvider>
          </AccountPrefsProvider>
        </ProfileProvider>
      </TripProvider>
    </>
  );
}
