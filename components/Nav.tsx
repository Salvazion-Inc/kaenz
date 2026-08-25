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
    <header className="absolute inset-x-0 top-0 z-40">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
        <Link href={pathFor(locale, "/")} className="flex items-center">
          <Logo size={56} />
        </Link>
        <div className="hidden items-center gap-6 text-sm font-semibold text-white/90 md:flex">
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
            className="rounded-full border border-white/30 px-3 py-1 text-xs tracking-wide"
          >
            {c.nav.login}
          </Link>
          <Link
            href="/app"
            className="rounded-full bg-kaenz px-4 py-2 text-xs font-bold text-white"
          >
            {c.nav.app}
          </Link>
        </div>
        <div className="flex items-center gap-3 md:hidden">
          <Link
            href="/login"
            className="text-xs font-bold tracking-wide text-white/90"
          >
            {c.nav.login}
          </Link>
          <Link
            href="/app"
            className="rounded-full bg-kaenz px-4 py-2 text-xs font-bold text-white"
          >
            {c.nav.app}
          </Link>
          <LanguageSwitcher compact />
        </div>
      </nav>
      <div className="flex flex-wrap justify-center gap-4 px-5 pb-3 text-xs font-semibold text-white/85 md:hidden">
        {links.map((l) => (
          <Link key={l.href} href={pathFor(locale, l.href)}>
            {l.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
