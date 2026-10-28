import "@/app/globals.css";
import { DocumentShell } from "@/components/DocumentShell";
import { DEFAULT_LOCALE } from "@/lib/locale";
import { siteMetadata, siteViewport } from "@/lib/site-metadata";

export const metadata = siteMetadata;
export const viewport = siteViewport;

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <DocumentShell locale={DEFAULT_LOCALE} poster>
      {children}
    </DocumentShell>
  );
}
