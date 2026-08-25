"use client";

import { WithLocale } from "@/components/WithLocale";
import { YachtDetail } from "@/components/pages/YachtDetail";
import type { Yacht } from "@/lib/yachts";

export function YachtDetailClient({ yacht }: { yacht: Yacht }) {
  return <WithLocale Component={YachtDetail} yacht={yacht} />;
}
