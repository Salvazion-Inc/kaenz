"use client";

import { LOCALES, localeMeta } from "@/lib/locale";
import { useLocale } from "@/lib/locale-context";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale();
  const size = compact
    ? "h-[15px] w-[22px]"
    : "h-[15px] w-[22px] md:h-[19px] md:w-[28px]";

  return (
    <nav aria-label="Language" className="flex items-center gap-1.5">
      {LOCALES.map((code) => {
        const meta = localeMeta[code];
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            title={meta.name}
            aria-label={meta.name}
            aria-current={active ? "true" : undefined}
            onClick={() => setLocale(code)}
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
          </button>
        );
      })}
    </nav>
  );
}
