import type { MetadataRoute } from "next";
import { languageAlternates, SITE } from "@/lib/locale";
import { yachts } from "@/lib/yachts";

const REVIEWED = new Date("2026-10-22");

const paths = [
  "/",
  "/fleet",
  "/join",
  "/login",
  "/signup",
  "/terms",
  "/privacy",
  "/terminos",
  "/privacidad",
  "/llms.txt",
  "/llms-full.txt",
  "/.well-known/ai.txt",
  "/ai.txt",
];

function entry(path: string, priority: number): MetadataRoute.Sitemap[number] {
  return {
    url: `${SITE}${path === "/" ? "" : path}`,
    lastModified: REVIEWED,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority,
    alternates: { languages: languageAlternates(path) },
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...paths.map((path) => entry(path, path === "/" ? 1 : path === "/fleet" || path === "/join" ? 0.8 : 0.4)),
    ...yachts.map((yacht) => entry(`/fleet/${yacht.id}`, 0.7)),
  ];
}
