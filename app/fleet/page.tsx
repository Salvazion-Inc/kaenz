"use client";

import { WithLocale } from "@/components/WithLocale";
import { FleetPage } from "@/components/pages/FleetPage";

export default function Page() {
  return <WithLocale Component={FleetPage} />;
}
