"use client";

import type { AppTab } from "@/lib/app-copy";
import type { Locale } from "@/lib/locale";
import { AccountTab } from "./AccountTab";
import { AppShell } from "./AppShell";
import { CrewTab } from "./CrewTab";
import { PlacesTab } from "./PlacesTab";
import { TripTab } from "./TripTab";
import { YachtsTab } from "./YachtsTab";

export function KaenzApp({ locale, tab }: { locale: Locale; tab: AppTab }) {
  const body =
    tab === "places" ? (
      <PlacesTab locale={locale} />
    ) : tab === "yachts" ? (
      <YachtsTab locale={locale} />
    ) : tab === "trip" ? (
      <TripTab locale={locale} />
    ) : tab === "account" ? (
      <AccountTab locale={locale} />
    ) : (
      <CrewTab locale={locale} />
    );

  return (
    <AppShell locale={locale} tab={tab}>
      {body}
    </AppShell>
  );
}
