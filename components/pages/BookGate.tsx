import Link from "next/link";
import { GuestBookForm } from "@/components/pages/GuestBookForm";
import { VerifyEmailScreen } from "@/components/VerifyEmailScreen";
import { t } from "@/lib/copy";
import type { BookingContact } from "@/lib/profile";
import type { Locale } from "@/lib/locale";
import type { Yacht } from "@/lib/yachts";

export function BookGate({
  locale,
  yacht,
  access,
  contact = null,
  email,
}: {
  locale: Locale;
  yacht: Yacht;
  access: "anon" | "unverified" | "verified";
  contact?: BookingContact | null;
  email?: string;
}) {
  const c = t(locale);
  if (access === "unverified") {
    return <VerifyEmailScreen email={email} />;
  }
  if (access === "verified") {
    return (
      <GuestBookForm locale={locale} yacht={yacht} places={[]} contact={contact} />
    );
  }
  const next = `/fleet/${yacht.id}`;
  const signup = `/signup?next=${encodeURIComponent(next)}`;
  const login = `/login?next=${encodeURIComponent(next)}`;
  return (
    <div className="mt-6">
      <p className="text-white/75">{c.verifyToBook}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={signup} className="btn-kaenz btn-book text-sm">
          {c.verifySignup}
        </Link>
        <Link href={login} className="btn-kaenz btn-book text-sm">
          {c.verifyLogin}
        </Link>
      </div>
    </div>
  );
}
