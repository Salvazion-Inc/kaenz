import { TripProvider } from "@/lib/trip-store";

export const metadata = {
  title: "Kaenz App",
  alternates: {
    canonical: "https://kaenz.com/es/app",
    languages: {
      en: "https://kaenz.com/app",
      es: "https://kaenz.com/es/app",
    },
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <TripProvider>{children}</TripProvider>;
}
