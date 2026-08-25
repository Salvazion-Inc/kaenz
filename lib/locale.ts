export const LOCALES = ["en", "es", "fr", "it"] as const;
export type Locale = (typeof LOCALES)[number];
export type Localized = Record<Locale, string>;

export const PREFIXED_LOCALES = ["es", "fr", "it"] as const;
export type PrefixedLocale = (typeof PREFIXED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const SITE = "https://kaenz.com";

export const localeMeta: Record<
  Locale,
  {
    flag: string;
    name: string;
    htmlLang: string;
    ogLocale: string;
    prefix: string;
    replyLanguage: string;
  }
> = {
  en: {
    flag: "usa",
    name: "English",
    htmlLang: "en",
    ogLocale: "en_US",
    prefix: "",
    replyLanguage: "English",
  },
  es: {
    flag: "spain",
    name: "Español",
    htmlLang: "es",
    ogLocale: "es_ES",
    prefix: "/es",
    replyLanguage: "Spanish",
  },
  fr: {
    flag: "france",
    name: "Français",
    htmlLang: "fr",
    ogLocale: "fr_FR",
    prefix: "/fr",
    replyLanguage: "French",
  },
  it: {
    flag: "italy",
    name: "Italiano",
    htmlLang: "it",
    ogLocale: "it_IT",
    prefix: "/it",
    replyLanguage: "Italian",
  },
};

export function isLocale(value: string | null | undefined): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function isPrefixedLocale(
  value: string | null | undefined,
): value is PrefixedLocale {
  return PREFIXED_LOCALES.includes(value as PrefixedLocale);
}

export function parseLocale(value: unknown): Locale {
  return isLocale(String(value)) ? (value as Locale) : DEFAULT_LOCALE;
}

export function pathFor(locale: Locale, href: string) {
  if (href.startsWith("http")) return href;
  const prefix = localeMeta[locale].prefix;
  if (!prefix) return href;
  if (href === "/") return prefix;
  return `${prefix}${href}`;
}

export function stripLocalePrefix(pathname: string): string {
  const match = pathname.match(/^\/(es|fr|it)(?=\/|$)/);
  if (!match) return pathname || "/";
  return pathname.slice(match[0].length) || "/";
}

export function localeFromPath(pathname: string): Locale {
  const match = pathname.match(/^\/(es|fr|it)(?=\/|$)/);
  return match ? (match[1] as Locale) : DEFAULT_LOCALE;
}

export function switchLocale(pathname: string, locale: Locale): string {
  if (pathname === "/terminos" || pathname === "/terms") {
    if (locale === "es") return "/terminos";
    if (locale === "en") return "/terms";
    return pathFor(locale, "/terms");
  }
  return pathFor(locale, stripLocalePrefix(pathname));
}

export function languageAlternates(path: string) {
  const bare = path === "/" ? "" : path;
  return {
    en: `${SITE}${bare}`,
    es: `${SITE}/es${bare}`,
    fr: `${SITE}/fr${bare}`,
    it: `${SITE}/it${bare}`,
    "x-default": `${SITE}${bare}`,
  };
}

export function otherLocale(locale: Locale): Locale {
  return locale === "en" ? "es" : "en";
}
