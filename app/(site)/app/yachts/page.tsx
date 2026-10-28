"use client";

import { KaenzApp } from "@/components/app/KaenzApp";
import { WithLocale } from "@/components/WithLocale";

export default function Page() {
  return <WithLocale Component={KaenzApp} tab="yachts" />;
}
