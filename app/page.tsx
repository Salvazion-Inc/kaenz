"use client";

import { HomePage } from "@/components/HomePage";
import { HomeJsonLd } from "@/components/seo/JsonLd";
import { WithLocale } from "@/components/WithLocale";

export default function Page() {
  return (
    <>
      <HomeJsonLd />
      <WithLocale Component={HomePage} />
    </>
  );
}
