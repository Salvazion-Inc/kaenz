"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, localeMeta, switchLocale, type Locale } from "@/lib/locale";

export function LanguageSwitcher({
  locale,
  compact = false,
}: {
  locale: Locale;
  compact?: boolean;
}) {
  const pathname = usePathname() || "/";
  const size = compact
    ? "h-[15px] w-[22px]"
    : "h-[15px] w-[22px] md:h-[19px] md:w-[28px]";

  return (
    <nav aria-label="Language" className="flex items-center gap-1.5">
      {LOCALES.map((code) => {
        const meta = localeMeta[code];
        const active = code === locale;
        return (
          <Link
            key={code}
            href={switchLocale(pathname, code)}
            hrefLang={code}
            title={meta.name}
            aria-label={meta.name}
            aria-current={active ? "true" : undefined}
            className={`lang-flag ${active ? "lang-flag-active" : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/flags/${meta.flag}.svg`}
              alt=""
              width={compact ? 22 : 28}
              height={compact ? 15 : 19}
              className={`block ${size}`}
            />
          </Link>
        );
      })}
    </nav>
  );
}
