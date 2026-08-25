"use client";

import { HomePage } from "@/components/HomePage";
import { WithLocale } from "@/components/WithLocale";

export default function Page() {
  return <WithLocale Component={HomePage} />;
}
