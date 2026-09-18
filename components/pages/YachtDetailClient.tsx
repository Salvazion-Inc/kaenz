"use client";

import { WithLocale } from "@/components/WithLocale";
import { YachtDetail } from "@/components/pages/YachtDetail";
import type { Yacht } from "@/lib/yachts";

export function YachtDetailClient({
  yacht,
  canceled = false,
}: {
  yacht: Yacht;
  canceled?: boolean;
}) {
  return (
    <WithLocale Component={YachtDetail} yacht={yacht} canceled={canceled} />
  );
}
