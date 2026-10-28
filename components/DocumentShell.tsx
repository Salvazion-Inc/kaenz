import { Analytics } from "@vercel/analytics/next";
import { Outfit } from "next/font/google";
import { ConciergeFlag } from "@/components/ConciergeFlag";
import { SiteJsonLd } from "@/components/seo/JsonLd";
import { conciergeEnabled } from "@/lib/concierge";
import { LocaleProvider } from "@/lib/locale-context";
import { LocationProvider } from "@/lib/location";
import { localeMeta, type Locale } from "@/lib/locale";

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  adjustFontFallback: true,
  fallback: ["Arial", "sans-serif"],
});

export function DocumentShell({
  locale,
  poster = false,
  children,
}: {
  locale: Locale;
  poster?: boolean;
  children: React.ReactNode;
}) {
  return (
    <html lang={localeMeta[locale].htmlLang}>
      {poster ? (
        <head>
          <link
            rel="preload"
            as="image"
            href="/hero-poster.avif"
            type="image/avif"
            fetchPriority="high"
          />
        </head>
      ) : null}
      <body className={`${outfit.className} antialiased`}>
        <SiteJsonLd />
        <LocaleProvider initialLocale={locale}>
          <ConciergeFlag enabled={conciergeEnabled()}>
            <LocationProvider>{children}</LocationProvider>
          </ConciergeFlag>
        </LocaleProvider>
        <Analytics />
      </body>
    </html>
  );
}
