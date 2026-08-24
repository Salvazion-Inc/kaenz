import type { Metadata } from "next";
import { Outfit } from "next/font/google";
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
      es: "https://kaenz.com/es",
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${outfit.className} antialiased`}>{children}</body>
    </html>
  );
}
