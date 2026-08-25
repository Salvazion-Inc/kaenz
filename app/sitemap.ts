import type { MetadataRoute } from "next";
import { languageAlternates, SITE } from "@/lib/locale";

const paths = [
  "/",
  "/app",
  "/app/yachts",
  "/app/request",
  "/app/trip",
  "/app/crew",
  "/fleet",
  "/book",
  "/concierge",
  "/join",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = paths.flatMap((path) => {
    const languages = languageAlternates(path);
    const urls = [
      languages.en.replace(SITE, "") || "/",
      languages.es.replace(SITE, ""),
      languages.fr.replace(SITE, ""),
      languages.it.replace(SITE, ""),
    ];
    return urls.map((url) => ({
      url: `${SITE}${url === "/" ? "" : url}`,
      lastModified: now,
      alternates: { languages },
    }));
  });

  pages.push(
    {
      url: `${SITE}/terms`,
      lastModified: now,
      alternates: {
        languages: {
          en: `${SITE}/terms`,
          es: `${SITE}/terminos`,
          fr: `${SITE}/fr/terms`,
          it: `${SITE}/it/terms`,
        },
      },
    },
    {
      url: `${SITE}/terminos`,
      lastModified: now,
      alternates: {
        languages: {
          en: `${SITE}/terms`,
          es: `${SITE}/terminos`,
          fr: `${SITE}/fr/terms`,
          it: `${SITE}/it/terms`,
        },
      },
    },
    {
      url: `${SITE}/es/terms`,
      lastModified: now,
      alternates: {
        languages: {
          en: `${SITE}/terms`,
          es: `${SITE}/terminos`,
          fr: `${SITE}/fr/terms`,
          it: `${SITE}/it/terms`,
        },
      },
    },
    {
      url: `${SITE}/fr/terms`,
      lastModified: now,
      alternates: {
        languages: {
          en: `${SITE}/terms`,
          es: `${SITE}/terminos`,
          fr: `${SITE}/fr/terms`,
          it: `${SITE}/it/terms`,
        },
      },
    },
    {
      url: `${SITE}/it/terms`,
      lastModified: now,
      alternates: {
        languages: {
          en: `${SITE}/terms`,
          es: `${SITE}/terminos`,
          fr: `${SITE}/fr/terms`,
          it: `${SITE}/it/terms`,
        },
      },
    },
  );

  return pages;
}
