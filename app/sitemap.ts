import type { MetadataRoute } from "next";

const site = "https://kaenz.com";

const pairs: { en: string; es: string }[] = [
  { en: "/", es: "/es" },
  { en: "/app", es: "/es/app" },
  { en: "/app/yachts", es: "/es/app/yachts" },
  { en: "/app/request", es: "/es/app/request" },
  { en: "/app/trip", es: "/es/app/trip" },
  { en: "/app/crew", es: "/es/app/crew" },
  { en: "/fleet", es: "/es/fleet" },
  { en: "/book", es: "/es/book" },
  { en: "/concierge", es: "/es/concierge" },
  { en: "/join", es: "/es/join" },
  { en: "/terms", es: "/terminos" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return pairs.flatMap(({ en, es }) => [
    {
      url: `${site}${en}`,
      lastModified: now,
      alternates: { languages: { en: `${site}${en}`, es: `${site}${es}` } },
    },
    {
      url: `${site}${es}`,
      lastModified: now,
      alternates: { languages: { en: `${site}${en}`, es: `${site}${es}` } },
    },
  ]);
}
