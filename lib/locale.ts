export const LOCALES = ["en", "es", "fr", "it"] as const;
export type Locale = (typeof LOCALES)[number];
export type Localized = Record<Locale, string>;

export const DEFAULT_LOCALE: Locale = "en";
export const SITE = "https://kaenz.com";
export const LOCALE_COOKIE = "kaenz_locale";

export const localeMeta: Record<
  Locale,
  {
    flag: string;
    name: string;
    htmlLang: string;
    ogLocale: string;
    replyLanguage: string;
  }
> = {
  en: {
    flag: "usa",
    name: "English",
    htmlLang: "en",
    ogLocale: "en_US",
    replyLanguage: "English",
  },
  es: {
    flag: "spain",
    name: "Español",
    htmlLang: "es",
    ogLocale: "es_ES",
    replyLanguage: "Spanish",
  },
  fr: {
    flag: "france",
    name: "Français",
    htmlLang: "fr",
    ogLocale: "fr_FR",
    replyLanguage: "French",
  },
  it: {
    flag: "italy",
    name: "Italiano",
    htmlLang: "it",
    ogLocale: "it_IT",
    replyLanguage: "Italian",
  },
};

export function isLocale(value: string | null | undefined): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function parseLocale(value: unknown): Locale {
  return isLocale(String(value)) ? (value as Locale) : DEFAULT_LOCALE;
}

export function pathFor(_locale: Locale, href: string) {
  if (href.startsWith("http")) return href;
  return href;
}

export function stripLocalePrefix(pathname: string): string {
  const match = pathname.match(/^\/(es|fr|it)(?=\/|$)/);
  if (!match) return pathname || "/";
  return pathname.slice(match[0].length) || "/";
}

export function localeFromPath(pathname: string): Locale | null {
  const match = pathname.match(/^\/(es|fr|it)(?=\/|$)/);
  return match ? (match[1] as Locale) : null;
}

export function languageAlternates(path: string) {
  const url = `${SITE}${path === "/" ? "" : path}`;
  return {
    en: url,
    es: url,
    fr: url,
    it: url,
    "x-default": url,
  };
}

export function localeCookieHeader(locale: Locale) {
  return `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function otherLocale(locale: Locale): Locale {
  return locale === "en" ? "es" : "en";
}
