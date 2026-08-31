import Link from "next/link";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";
import { t } from "@/lib/copy";
import { pathFor, type Locale } from "@/lib/locale";

export function Nav({ locale }: { locale: Locale }) {
  const c = t(locale);
  const links = [
    { href: "/fleet", label: c.nav.fleet },
    { href: "/book", label: c.nav.book },
    { href: "/concierge", label: c.nav.concierge },
    { href: "/join", label: c.nav.join },
  ];

  return (
    <header className="absolute inset-x-0 top-0 z-40 px-3 pt-3 md:px-5">
      <nav className="nav-island mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-full px-3 py-2 md:px-4">
        <Link href={pathFor(locale, "/")} className="flex items-center pl-1">
          <Logo size={44} />
        </Link>
        <div className="hidden items-center gap-5 text-sm font-semibold text-white/88 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={pathFor(locale, l.href)}
              className="transition hover:text-kaenz"
            >
              {l.label}
            </Link>
          ))}
          <LanguageSwitcher />
          <Link
            href="/login"
            className="rounded-full border border-white/20 px-3.5 py-1.5 text-xs tracking-wide text-white/90 transition hover:border-kaenz hover:text-kaenz"
          >
            {c.nav.login}
          </Link>
          <Link href="/app" className="btn-kaenz !px-4 !py-2 text-xs">
            {c.nav.app}
          </Link>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/login"
            className="text-xs font-bold tracking-wide text-white/90"
          >
            {c.nav.login}
          </Link>
          <Link href="/app" className="btn-kaenz !px-3.5 !py-1.5 text-xs">
            {c.nav.app}
          </Link>
          <LanguageSwitcher compact />
        </div>
      </nav>
      <div className="flex flex-wrap justify-center gap-4 px-4 pb-2 pt-3 text-xs font-semibold text-white/85 md:hidden">
        {links.map((l) => (
          <Link key={l.href} href={pathFor(locale, l.href)}>
            {l.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
