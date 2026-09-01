"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";
import { t } from "@/lib/copy";
import { pathFor, type Locale } from "@/lib/locale";

export function Nav({ locale }: { locale: Locale }) {
  const c = t(locale);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 md:h-16 md:px-5">
        <Link href={pathFor(locale, "/")} className="flex items-center">
          <Logo size={40} className="h-9 w-9 md:h-10 md:w-10" />
        </Link>
        <div className="hidden items-center gap-5 text-sm font-semibold text-white/88 md:flex">
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
    </header>
  );
}
