import { languageAlternates, PREFIXED_LOCALES, SITE } from "@/lib/locale";
import { requirePrefixedLocale } from "@/lib/prefixed";
import { TripProvider } from "@/lib/trip-store";

export function generateStaticParams() {
  return PREFIXED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await requirePrefixedLocale(params);
  return {
    title: "Kaenz App",
    alternates: {
      canonical: `${SITE}/${locale}/app`,
      languages: languageAlternates("/app"),
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <TripProvider>{children}</TripProvider>;
}
