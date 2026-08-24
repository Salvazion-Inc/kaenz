export type Locale = "en" | "es";

export function pathFor(locale: Locale, href: string) {
  if (href.startsWith("http")) return href;
  if (locale === "es") {
    if (href === "/") return "/es";
    return `/es${href}`;
  }
  return href;
}

export function otherLocale(locale: Locale): Locale {
  return locale === "en" ? "es" : "en";
}
