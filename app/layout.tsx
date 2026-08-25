import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Outfit } from "next/font/google";
import { LocaleProvider } from "@/lib/locale-context";
import { LOCALE_COOKIE, parseLocale } from "@/lib/locale";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const viewport = {
  themeColor: "#00a1d6",
  viewportFit: "cover" as const,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://kaenz.com"),
  title: "Kaenz: Leave the Car and travel by Yacht!!",
  description:
    "Kaenz: “We believe that water is the smartest, most beautiful, and most fun way to get around South Florida.”",
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
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Kaenz: Leave the Car and travel by Yacht!!",
    description:
      "Kaenz: “We believe that water is the smartest, most beautiful, and most fun way to get around South Florida.”",
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
        <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
