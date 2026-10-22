const SITE = "https://kaenz.com";

const DESCRIPTION =
  "Kaenz is an end-to-end platform for Commute, Tour, and Special Occasion yacht trips in marinas and ports worldwide. Independent owners, captains, and marinas run each trip. An algorithm sets the price from trip type, duration, yacht type, guests, and date — then you pay with Stripe.";

function script(data: unknown) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export function SiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE}/#organization`,
        name: "Kaenz",
        url: SITE,
        logo: `${SITE}/icon-512.png`,
        image: `${SITE}/hero-poster.jpg`,
        email: "info@salvazion.org",
        slogan: "Skip the traffic. Travel by yacht.",
        description: DESCRIPTION,
        sameAs: ["https://www.instagram.com/kaenz_yachts/"],
        knowsAbout: [
          "Commute",
          "Tour",
          "Special Occasion",
          "yacht",
          "marina",
          "Stripe",
        ],
        areaServed: "Worldwide",
        address: {
          "@type": "PostalAddress",
          streetAddress: "131 Continental Dr, Suite 305",
          addressLocality: "Newark",
          addressRegion: "DE",
          postalCode: "19713",
          addressCountry: "US",
        },
        parentOrganization: {
          "@type": "Organization",
          name: "Salvazion, Inc.",
          url: "https://salvazion.org",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE}/#website`,
        url: SITE,
        name: "Kaenz",
        description: DESCRIPTION,
        inLanguage: ["en", "es", "fr", "it", "pt"],
        publisher: { "@id": `${SITE}/#organization` },
      },
      {
        "@type": "Service",
        "@id": `${SITE}/#service`,
        name: "Kaenz",
        serviceType: "Yacht travel platform",
        provider: { "@id": `${SITE}/#organization` },
        areaServed: "Worldwide",
        url: SITE,
        description: DESCRIPTION,
      },
    ],
  };
  return script(data);
}

export function HomeJsonLd() {
  return script({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${SITE}/#webpage`,
    url: SITE,
    name: "Kaenz: Commute, Tour & Special Occasion by yacht",
    description: DESCRIPTION,
    isPartOf: { "@id": `${SITE}/#website` },
    about: { "@id": `${SITE}/#service` },
    inLanguage: ["en", "es", "fr", "it", "pt"],
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["#hero-heading", "#hero-lead"],
    },
  });
}
