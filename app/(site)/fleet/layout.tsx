import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Choose your yacht | Kaenz",
  description:
    "Private, captained, ready when you are. Commute, Tour, and Special Occasion yacht trips on Kaenz.",
  openGraph: {
    title: "Choose your yacht | Kaenz",
    description:
      "Private, captained, ready when you are. Commute, Tour, and Special Occasion yacht trips on Kaenz.",
    url: "https://kaenz.com/fleet",
    images: [{ url: "/site/yacht-dusk.jpg", alt: "Kaenz yacht" }],
  },
};

export default function FleetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
