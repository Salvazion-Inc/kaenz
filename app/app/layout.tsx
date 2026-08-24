import { TripProvider } from "@/lib/trip-store";

export const metadata = {
  title: "Kaenz App",
  appleWebApp: {
    capable: true,
    title: "Kaenz",
    statusBarStyle: "black-translucent" as const,
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <TripProvider>{children}</TripProvider>;
}
