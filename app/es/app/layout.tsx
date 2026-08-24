import { TripProvider } from "@/lib/trip-store";

export const metadata = { title: "Kaenz App" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <TripProvider>{children}</TripProvider>;
}
