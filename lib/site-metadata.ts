import type { Metadata } from "next";

export const siteViewport = {
  themeColor: "#00a1d6",
  viewportFit: "cover" as const,
};

export const siteMetadata: Metadata = {
  metadataBase: new URL("https://kaenz.com"),
  title: "Kaenz: Commute, Tour & Special Occasion by yacht",
  description:
    "Kaenz is an end-to-end yacht platform — not a charter operator — for Commute, Tour, and Special Occasion trips worldwide. Pay with Stripe.",
  applicationName: "Kaenz",
  authors: [{ name: "Salvazion, Inc.", url: "https://salvazion.org" }],
  creator: "Salvazion, Inc.",
  publisher: "Salvazion, Inc.",
  category: "Travel",
  keywords: [
    "Kaenz",
    "yacht commute",
    "yacht tour",
    "special occasion yacht",
    "marina",
    "Skip the traffic. Travel by yacht.",
  ],
  alternates: {
    canonical: "./",
    languages: {
      en: "./",
      es: "./",
      fr: "./",
      it: "./",
      pt: "./",
      "x-default": "./",
    },
    types: {
      "text/plain": [
        { url: "/llms.txt", title: "LLM brief" },
        { url: "/llms-full.txt", title: "LLM citation brief" },
        { url: "/.well-known/ai.txt", title: "AI usage policy" },
      ],
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
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
    siteName: "Kaenz",
    locale: "en_US",
    images: [
      {
        url: "/hero-poster.jpg",
        alt: "Skip the traffic. Travel by yacht.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kaenz: Commute, Tour & Special Occasion by yacht",
    description:
      "Skip the traffic. Travel by yacht. Commute, Tour, and Special Occasion.",
    images: ["/hero-poster.jpg"],
  },
  other: {
    "tdm-reservation": "0",
  },
};
