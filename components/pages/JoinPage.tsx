import Link from "next/link";
import { Site } from "@/components/Site";
import { t } from "@/lib/copy";
import { pathFor, type Locale } from "@/lib/locale";

export function JoinPage({ locale }: { locale: Locale }) {
  const c = t(locale);
  return (
    <Site locale={locale}>
      <section className="mx-auto max-w-4xl px-5 pb-24">
        <p className="kaenz-kicker">{c.nav.app}</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">{c.joinPageTitle}</h1>
        <p className="mt-3 text-white/70">{c.joinPageLead}</p>
        <ul className="mt-8 space-y-2 text-sm text-white/75">
          <li>{c.joinFee}</li>
          <li>{c.joinCaptains}</li>
          <li>{c.joinOwners}</li>
        </ul>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Link
            href={`${pathFor(locale, "/app/yachts")}?add=yacht`}
            className="kaenz-card kaenz-card-hover p-8"
          >
            <h2 className="text-2xl font-extrabold">{c.joinTitle}</h2>
            <p className="mt-3 text-sm text-white/70">{c.joinLead}</p>
            <span className="btn-kaenz mt-6 text-sm">{c.joinCta}</span>
          </Link>
          <Link
            href={`${pathFor(locale, "/app")}?add=marina`}
            className="kaenz-card kaenz-card-hover p-8"
          >
            <h2 className="text-2xl font-extrabold">{c.marinasTitle}</h2>
            <p className="mt-3 text-sm text-white/70">{c.marinasBody}</p>
            <span className="btn-kaenz mt-6 text-sm">{c.marinasCta}</span>
          </Link>
        </div>
      </section>
    </Site>
  );
}
