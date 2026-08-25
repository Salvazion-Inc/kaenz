"use client";

import { WithLocale } from "@/components/WithLocale";
import { ConciergePage } from "@/components/pages/ConciergePage";

export default function Page() {
  return <WithLocale Component={ConciergePage} />;
}
