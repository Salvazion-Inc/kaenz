"use client";

import type { AppTab } from "@/lib/app-copy";
import type { Locale } from "@/lib/locale";
import { AppShell } from "./AppShell";
import { CrewTab } from "./CrewTab";
import { PlacesTab } from "./PlacesTab";
import { RequestTab } from "./RequestTab";
import { TripTab } from "./TripTab";
import { YachtsTab } from "./YachtsTab";

export function KaenzApp({ locale, tab }: { locale: Locale; tab: AppTab }) {
  const body =
    tab === "places" ? (
      <PlacesTab locale={locale} />
    ) : tab === "yachts" ? (
      <YachtsTab locale={locale} />
    ) : tab === "request" ? (
      <RequestTab locale={locale} />
    ) : tab === "trip" ? (
      <TripTab locale={locale} />
    ) : (
      <CrewTab locale={locale} />
    );

  return (
    <AppShell locale={locale} tab={tab}>
      {body}
    </AppShell>
  );
}
