import Link from "next/link";
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
  const other = locale === "en" ? "/es" : "/";
  const otherLabel = locale === "en" ? "ES" : "EN";

  return (
    <header className="absolute inset-x-0 top-0 z-40">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
        <Link href={pathFor(locale, "/")} className="flex items-center gap-3">
          <Logo size={56} />
          <span className="text-lg font-bold tracking-wide text-white">
            Kaenz
          </span>
        </Link>
        <div className="hidden items-center gap-7 text-sm font-semibold text-white/90 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={pathFor(locale, l.href)}
              className="transition hover:text-kaenz"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href={other}
            className="rounded-full border border-white/30 px-3 py-1 text-xs tracking-widest"
            aria-label={
              locale === "en"
                ? "Cambiar idioma al español"
                : "Switch language to English"
            }
          >
            {otherLabel}
          </Link>
        </div>
        <div className="flex items-center gap-3 md:hidden">
          <Link
            href={pathFor(locale, "/book")}
            className="rounded-full bg-kaenz px-4 py-2 text-xs font-bold text-white"
          >
            {c.bookNow}
          </Link>
          <Link href={other} className="text-xs font-bold tracking-widest">
            {otherLabel}
          </Link>
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
