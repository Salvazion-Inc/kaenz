"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { LogoutForm } from "./LogoutForm";
import { Logo } from "./Logo";
import { t } from "@/lib/copy";
import { pathFor, type Locale } from "@/lib/locale";

export function Nav({
  locale,
  signedIn = false,
  accountName = "",
}: {
  locale: Locale;
  signedIn?: boolean;
  accountName?: string;
}) {
  const c = t(locale);
  const [scrolled, setScrolled] = useState(false);
  const [on, setOn] = useState(signedIn);
  const [name, setName] = useState(accountName);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const user = data.user as { name?: string; email?: string } | null;
        setOn(Boolean(user));
        setName(user?.name || user?.email || "");
      })
      .catch(() => {
        if (!cancelled) setOn(signedIn);
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const loginClass =
    "rounded-full border border-white/20 px-3.5 py-1.5 text-xs tracking-wide text-white/90 transition hover:border-kaenz hover:text-kaenz";
  const accountClass = "text-xs font-bold tracking-wide text-white/90 hover:text-kaenz";
  const logoutClass =
    "rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-bold tracking-wide text-white/90 transition hover:border-kaenz hover:text-kaenz";

  function sessionLinks(compact: boolean) {
    if (!on) {
      return (
        <Link href="/login" className={compact ? "text-xs font-bold tracking-wide text-white/90" : loginClass}>
          {c.nav.login}
        </Link>
      );
    }
    return (
      <>
        <Link href={pathFor(locale, "/app/account")} className={accountClass}>
          {name || c.nav.account}
        </Link>
        <LogoutForm label={c.nav.logout} className={compact ? "text-xs font-bold text-white/90" : logoutClass} />
      </>
    );
  }

  return (
    <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 md:h-16 md:px-5">
        <Link href={pathFor(locale, "/")} className="flex items-center">
          <Logo size={40} className="h-9 w-9 md:h-10 md:w-10" />
        </Link>
        <div className="hidden items-center gap-5 text-sm font-semibold text-white/88 md:flex">
          <LanguageSwitcher />
          {sessionLinks(false)}
          <Link href="/app" className="btn-kaenz !px-4 !py-2 text-xs">
            {c.nav.app}
          </Link>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          {sessionLinks(true)}
          <Link href="/app" className="btn-kaenz !px-3.5 !py-1.5 text-xs">
            {c.nav.app}
          </Link>
          <LanguageSwitcher compact />
        </div>
      </nav>
    </header>
  );
}
