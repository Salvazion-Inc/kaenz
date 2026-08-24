import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://kaenz.com/sitemap.xml",
    host: "https://kaenz.com",
  };
}
