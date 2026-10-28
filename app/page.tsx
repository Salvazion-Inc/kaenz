import { HomeScreen } from "@/components/HomeScreen";
import { HomeJsonLd } from "@/components/seo/JsonLd";

export const revalidate = 86400;

export default function Page() {
  return (
    <>
      <HomeJsonLd />
      <HomeScreen />
    </>
  );
}
