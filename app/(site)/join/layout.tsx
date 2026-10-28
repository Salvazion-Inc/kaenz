import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Do you Own a Yacht and Are you a Captain? | Kaenz",
  description:
    "Open Kaenz, go to Yachts, and list your boat with a verified captain. Independent owners and captains are paid through Stripe on every trip.",
  openGraph: {
    title: "Do you Own a Yacht and Are you a Captain? | Kaenz",
    description:
      "Open Kaenz, go to Yachts, and list your boat with a verified captain. Independent owners and captains are paid through Stripe on every trip.",
    url: "https://kaenz.com/join",
  },
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
