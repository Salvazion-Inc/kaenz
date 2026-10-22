"use client";

import Image from "next/image";
import Link from "next/link";
import { at, type AppTab } from "@/lib/app-copy";
import { pathFor, type Locale } from "@/lib/locale";
import { useLocation } from "@/lib/location";
import { HtmlLang } from "../HtmlLang";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { BiometricEnrollPrompt } from "../auth/BiometricEnrollPrompt";
import { AccountChip } from "../AccountChip";
import {
  IconAccount,
  IconCrew,
  IconPin,
  IconTrip,
  IconYacht,
} from "./icons";

const TABS: {
  id: AppTab;
  href: string;
  Icon: typeof IconPin;
}[] = [
  { id: "places", href: "/app", Icon: IconPin },
  { id: "yachts", href: "/app/yachts", Icon: IconYacht },
  { id: "trip", href: "/app/trip", Icon: IconTrip },
  { id: "crew", href: "/app/crew", Icon: IconCrew },
  { id: "account", href: "/app/account", Icon: IconAccount },
];

export function AppShell({
  locale,
  tab,
  children,
}: {
  locale: Locale;
  tab: AppTab;
  children: React.ReactNode;
}) {
  const c = at(locale);
  const { here, located } = useLocation();

  return (
    <div className="app-shell min-h-dvh bg-navy text-foam">
      <BiometricEnrollPrompt locale={locale} />
      <HtmlLang locale={locale} />
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[4.75rem] flex-col items-center border-r border-white/10 bg-navy-2/95 py-4 backdrop-blur-xl md:flex">
        <Link href={pathFor(locale, "/app")} className="mb-6">
          <Image
            src="/brand/logo-app.png"
            alt="Kaenz"
            width={44}
            height={44}
            className="rounded-2xl ring-1 ring-kaenz/45"
          />
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {TABS.map(({ id, href, Icon }) => {
            const active = tab === id;
            return (
              <Link
                key={id}
                href={pathFor(locale, href)}
                className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-[10px] font-semibold transition ${
                  active
                    ? "bg-kaenz/18 text-kaenz shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-kaenz)_35%,transparent)]"
                    : "text-white/55 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-6 w-6" />
                {c.tabs[id]}
              </Link>
            );
          })}
        </nav>
      </aside>

      <header className="app-header-glass sticky top-0 z-30 flex items-center justify-between border-b border-white/10 px-4 py-3 md:ml-[4.75rem]">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/logo-app.png"
            alt="Kaenz"
            width={56}
            height={56}
            className="h-14 w-14 shrink-0 rounded-xl ring-1 ring-kaenz/50 md:hidden"
            priority
          />
          <div>
            <p className="text-sm font-bold leading-none">{c.appName}</p>
            <p className="mt-1 text-xs text-kaenz">
              {located ? here.label : c.location}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold">
          <LanguageSwitcher compact />
          <AccountChip locale={locale} />
          <Link href={pathFor(locale, "/")} className="text-white/60">
            {c.openMarketing}
          </Link>
        </div>
      </header>

      <main className="app-main mx-auto w-full max-w-6xl px-4 pb-28 pt-5 md:ml-[4.75rem] md:pb-10">
        {children}
      </main>

      <nav className="app-header-glass fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/10 px-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-2 md:hidden">
        {TABS.map(({ id, href, Icon }) => {
          const active = tab === id;
          return (
            <Link
              key={id}
              href={pathFor(locale, href)}
              className={`flex flex-col items-center gap-1 py-1 text-[10px] font-semibold ${
                active ? "text-kaenz" : "text-white/50"
              }`}
            >
              <Icon className="h-6 w-6" />
              {c.tabs[id]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
