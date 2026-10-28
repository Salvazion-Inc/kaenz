import { HomePage } from "@/components/HomePage";
import { HomeJsonLd } from "@/components/seo/JsonLd";
import { DEFAULT_LOCALE } from "@/lib/locale";

export const revalidate = 86400;

export default function Page() {
  return (
    <>
      <HomeJsonLd />
      <HomePage locale={DEFAULT_LOCALE} />
    </>
  );
}
