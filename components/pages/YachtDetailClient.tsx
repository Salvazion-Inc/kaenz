"use client";

import type { NavViewer } from "@/components/Nav";
import { WithLocale } from "@/components/WithLocale";
import { YachtDetail } from "@/components/pages/YachtDetail";
import type { BookingContact } from "@/lib/profile";
import type { Yacht } from "@/lib/yachts";

export function YachtDetailClient({
  yacht,
  canceled = false,
  viewer = null,
  access = "anon",
  contact = null,
}: {
  yacht: Yacht;
  canceled?: boolean;
  viewer?: NavViewer | null;
  access?: "anon" | "unverified" | "verified";
  contact?: BookingContact | null;
}) {
  return (
    <WithLocale
      Component={YachtDetail}
      yacht={yacht}
      canceled={canceled}
      viewer={viewer}
      access={access}
      contact={contact}
    />
  );
}
