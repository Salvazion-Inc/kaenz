import { HomeClient } from "@/components/HomeClient";
import { HomeJsonLd } from "@/components/seo/JsonLd";

export const revalidate = 86400;

export default function Page() {
  return (
    <>
      <HomeJsonLd />
      <HomeClient />
    </>
  );
}
