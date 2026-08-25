import Link from "next/link";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";
import { t } from "@/lib/copy";
import { pathFor, type Locale } from "@/lib/locale";

export function Footer({ locale }: { locale: Locale }) {
  const c = t(locale);
  return (
    <footer className="border-t border-white/10 bg-navy">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Logo size={64} />
          <div>
            <p className="font-bold">Kaenz</p>
            <p className="max-w-sm text-sm text-white/70">{c.metaDescription}</p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-5">
          <div className="flex flex-wrap gap-5 text-sm font-semibold text-white/80">
            <Link href={pathFor(locale, "/app")}>{c.nav.app}</Link>
            <Link href={pathFor(locale, "/fleet")}>{c.nav.fleet}</Link>
            <Link href={pathFor(locale, "/book")}>{c.nav.book}</Link>
            <Link href={pathFor(locale, "/concierge")}>{c.nav.concierge}</Link>
            <Link href={pathFor(locale, "/join")}>{c.nav.join}</Link>
            <Link href={c.termsHref}>{c.nav.terms}</Link>
          </div>
          <LanguageSwitcher />
        </div>
      </div>
      <p className="pb-8 text-center text-xs text-white/50">
        <a href="https://salvazion.org" className="hover:text-kaenz">
          {c.rights}
        </a>
      </p>
    </footer>
  );
}
