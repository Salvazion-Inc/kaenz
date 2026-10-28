import "@/app/globals.css";
import { cookies } from "next/headers";
import { DocumentShell } from "@/components/DocumentShell";
import { LOCALE_COOKIE, parseLocale } from "@/lib/locale";
import { siteMetadata, siteViewport } from "@/lib/site-metadata";

export const metadata = siteMetadata;
export const viewport = siteViewport;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const locale = parseLocale(jar.get(LOCALE_COOKIE)?.value);
  return <DocumentShell locale={locale}>{children}</DocumentShell>;
}
