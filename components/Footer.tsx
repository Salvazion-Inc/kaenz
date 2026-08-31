import Link from "next/link";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";
import { t } from "@/lib/copy";
import { pathFor, type Locale } from "@/lib/locale";

const INSTAGRAM_URL = "https://www.instagram.com/kaenz_yachts/";
const INSTAGRAM_HANDLE = "@kaenz_yachts";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H7zm10.25 1.25a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM12 8.5A3.5 3.5 0 1 1 12 15.5 3.5 3.5 0 0 1 12 8.5z" />
    </svg>
  );
}

export function Footer({ locale }: { locale: Locale }) {
  const c = t(locale);
  return (
    <footer className="border-t border-white/10 bg-navy">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-14 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-4">
          <Logo size={64} />
          <p className="max-w-sm text-sm leading-relaxed text-white/65">
            {c.metaDescription}
          </p>
        </div>
        <div className="grid gap-8 text-sm sm:grid-cols-2">
          <div className="flex flex-col gap-2.5 font-semibold text-white/80">
            <p className="kaenz-kicker mb-1">{c.nav.app}</p>
            <Link href={pathFor(locale, "/app")} className="hover:text-kaenz">
              {c.platformFeatures[0].title}
            </Link>
            <Link href={pathFor(locale, "/app/yachts")} className="hover:text-kaenz">
              {c.platformFeatures[1].title}
            </Link>
            <Link href={pathFor(locale, "/app/trip")} className="hover:text-kaenz">
              {c.platformFeatures[2].title}
            </Link>
            <Link href={pathFor(locale, "/app/crew")} className="hover:text-kaenz">
              {c.platformFeatures[3].title}
            </Link>
          </div>
          <div className="flex flex-col gap-2.5 font-semibold text-white/80">
            <p className="kaenz-kicker mb-1">{c.brand}</p>
            <Link href={pathFor(locale, "/fleet")} className="hover:text-kaenz">
              {c.nav.fleet}
            </Link>
            <Link href={pathFor(locale, "/join")} className="hover:text-kaenz">
              {c.nav.join}
            </Link>
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 pb-4">
        <LanguageSwitcher />
      </div>
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 pb-10 text-[11px] text-white/50 sm:flex-row">
        <p>
          <a href="https://salvazion.org" className="hover:text-kaenz">
            {c.rights}
          </a>
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href={c.termsHref} className="hover:text-kaenz">
            {c.nav.terms}
          </Link>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white transition hover:border-kaenz hover:text-kaenz"
            aria-label={`${INSTAGRAM_HANDLE} on Instagram`}
            title={INSTAGRAM_HANDLE}
          >
            <InstagramIcon className="h-4 w-4" />
          </a>
          <Link href={c.privacyHref} className="hover:text-kaenz">
            {c.nav.privacy}
          </Link>
        </div>
      </div>
    </footer>
  );
}
