import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { cookies } from "next/headers";
import localFont from "next/font/local";
import { LocaleProvider } from "@/lib/locale-context";
import { LocationProvider } from "@/lib/location";
import { LOCALE_COOKIE, parseLocale } from "@/lib/locale";
import "./globals.css";

// Self-hosted so `next build` never fetches fonts.google.com.
const outfit = localFont({
  src: "./fonts/Outfit-Variable.ttf",
  weight: "100 900",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
  adjustFontFallback: false,
});

export const viewport = {
  themeColor: "#00a1d6",
  viewportFit: "cover" as const,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://kaenz.com"),
  title: "Kaenz: Commute, Tour & Special Occasion by yacht",
  description:
    "Kaenz is an end-to-end yacht platform — not a charter operator — for Commute, Tour, and Special Occasion trips worldwide. Pay with Stripe.",
  alternates: {
    canonical: "https://kaenz.com",
    languages: {
      en: "https://kaenz.com",
      es: "https://kaenz.com",
      fr: "https://kaenz.com",
      it: "https://kaenz.com",
      pt: "https://kaenz.com",
      "x-default": "https://kaenz.com",
    },
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Kaenz",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon.png" },
      { url: "/icon.png", sizes: "192x192" },
      { url: "/icon-512.png", sizes: "512x512" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Kaenz: Commute, Tour & Special Occasion by yacht",
    description:
      "Kaenz is an end-to-end yacht platform for Commute, Tour, and Special Occasion trips worldwide. Pay with Stripe.",
    type: "website",
    url: "https://kaenz.com",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const jar = await cookies();
  const locale = parseLocale(jar.get(LOCALE_COOKIE)?.value);
  return (
    <html lang={locale}>
      <body className={`${outfit.className} antialiased`}>
        <LocaleProvider initialLocale={locale}>
          <LocationProvider>{children}</LocationProvider>
        </LocaleProvider>
        <Analytics />
      </body>
    </html>
  );
}
