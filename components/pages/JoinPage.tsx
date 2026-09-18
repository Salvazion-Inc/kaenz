import Link from "next/link";
import { JoinForm } from "@/components/JoinForm";
import { Site } from "@/components/Site";
import { t } from "@/lib/copy";
import { pathFor, type Locale } from "@/lib/locale";

export function JoinPage({ locale }: { locale: Locale }) {
  const c = t(locale);
  return (
    <Site locale={locale}>
      <section className="mx-auto max-w-4xl px-5 pb-24">
        <p className="kaenz-kicker">{c.nav.join}</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">
          {c.joinPageTitle}
        </h1>
        <p className="mt-3 text-white/70">{c.joinPageLead}</p>
        <ul className="mt-8 space-y-2 text-sm text-white/75">
          <li>{c.joinFee}</li>
          <li>{c.joinCaptains}</li>
          <li>{c.joinOwners}</li>
        </ul>
        <div className="mt-10">
          <JoinForm locale={locale} />
        </div>
        <p className="mt-8 text-sm text-white/55">
          <Link
            href={`${pathFor(locale, "/login")}?next=${encodeURIComponent("/app")}`}
            className="font-semibold text-kaenz hover:underline"
          >
            {c.haveAccount}
          </Link>
        </p>
      </section>
    </Site>
  );
}
