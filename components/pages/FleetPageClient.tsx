"use client";

import { WithLocale } from "@/components/WithLocale";
import { FleetPage } from "./FleetPage";

export function FleetPageClient({ signedIn }: { signedIn: boolean }) {
  return <WithLocale Component={FleetPage} signedIn={signedIn} />;
}
