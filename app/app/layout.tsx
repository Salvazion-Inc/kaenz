import { TripProvider } from "@/lib/trip-store";

export const metadata = {
  title: "Kaenz App",
  alternates: {
    canonical: "https://kaenz.com/app",
    languages: {
      en: "https://kaenz.com/app",
      es: "https://kaenz.com/app",
      fr: "https://kaenz.com/app",
      it: "https://kaenz.com/app",
      "x-default": "https://kaenz.com/app",
    },
  },
  appleWebApp: {
    capable: true,
    title: "Kaenz",
    statusBarStyle: "black-translucent" as const,
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <TripProvider>{children}</TripProvider>;
}
