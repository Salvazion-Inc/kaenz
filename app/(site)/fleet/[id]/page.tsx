import { cookies, headers } from "next/headers";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { YachtDetailClient } from "@/components/pages/YachtDetailClient";
import { resolveRequestSession } from "@/lib/account-verification";
import { fleetAccess } from "@/lib/fleet-access";
import { resolveInventoryYacht } from "@/lib/inventory";
import { loadBookingContact } from "@/lib/profile";
import { yachtById, yachts, type Yacht } from "@/lib/yachts";

const SITE = "https://kaenz.com";

function yachtJsonLd(yacht: Yacht) {
  const url = `${SITE}/fleet/${yacht.id}`;
  const image = yacht.image.startsWith("http") ? yacht.image : `${SITE}${yacht.image}`;
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: yacht.name,
        description: yacht.blurb.en,
        image,
        url,
        brand: { "@type": "Brand", name: "Kaenz" },
        category: "Yacht",
        additionalProperty: [
          { "@type": "PropertyValue", name: "Length", value: `${yacht.lengthFt} ft` },
          { "@type": "PropertyValue", name: "Guests", value: String(yacht.guests) },
          { "@type": "PropertyValue", name: "Marina", value: yacht.marina },
        ],
        ...(yacht.priceFromUsd
          ? {
              offers: {
                "@type": "Offer",
                priceCurrency: "USD",
                price: String(yacht.priceFromUsd),
                availability: "https://schema.org/InStock",
                url,
              },
            }
          : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Kaenz", item: SITE },
          { "@type": "ListItem", position: 2, name: "Yachts", item: `${SITE}/fleet` },
          { "@type": "ListItem", position: 3, name: yacht.name, item: url },
        ],
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const yacht = yachtById(id);
  if (!yacht) {
    return {
      title: "Yacht | Kaenz",
      description:
        "Commute, Tour, and Special Occasion yacht trips on Kaenz. Independent captains run each trip.",
    };
  }
  const description = yacht.blurb.en;
  return {
    title: `${yacht.name} | Kaenz`,
    description,
    alternates: { canonical: `/fleet/${yacht.id}` },
    openGraph: {
      title: `${yacht.name} | Kaenz`,
      description,
      url: `${SITE}/fleet/${yacht.id}`,
      images: [yacht.image],
    },
  };
}

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export function generateStaticParams() {
  return yachts.map((y) => ({ id: y.id }));
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const yacht = await resolveInventoryYacht(id);
  if (!yacht) notFound();

  const jar = await cookies();
  const headerList = await headers();
  const cookie = jar
    .getAll()
    .map((item) => `${item.name}=${encodeURIComponent(item.value)}`)
    .join("; ");
  const reqHeaders = new Headers();
  headerList.forEach((value, key) => reqHeaders.set(key, value));
  if (cookie) reqHeaders.set("cookie", cookie);
  const req = new Request(`https://kaenz.com/fleet/${id}`, { headers: reqHeaders });
  const session = await resolveRequestSession(cookie, req);
  const access = fleetAccess(session.user, session.verified);
  const contact = session.user ? await loadBookingContact(cookie, session.user) : null;
  const viewer = session.user
    ? {
        name: contact?.fullName || session.user.name,
        email: contact?.email || session.user.email,
      }
    : null;

  return (
    <>
      {yachtJsonLd(yacht)}
      <YachtDetailClient
        yacht={yacht}
        canceled={query.checkout === "cancel"}
        viewer={viewer}
        access={access}
        contact={access === "verified" ? contact : null}
      />
    </>
  );
}
