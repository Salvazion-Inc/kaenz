import type { MetadataRoute } from "next";
import { languageAlternates, SITE } from "@/lib/locale";

const paths = [
  "/",
  "/app",
  "/app/yachts",
  "/app/trip",
  "/app/crew",
  "/app/account",
  "/fleet",
  "/join",
  "/login",
  "/signup",
  "/terms",
  "/privacy",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return paths.map((path) => ({
    url: `${SITE}${path === "/" ? "" : path}`,
    lastModified: now,
    alternates: { languages: languageAlternates(path) },
  }));
}
