"use client";

import { at } from "@/lib/app-copy";
import type { Locale } from "@/lib/locale";
import { ImmortalizeTrip } from "./ImmortalizeTrip";
import { TopSelfies } from "./TopSelfies";

export function CrewTab({ locale }: { locale: Locale }) {
  const c = at(locale);

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight">{c.tabs.crew}</h1>
      <p className="mt-1 text-sm text-white/70">{c.crewLead}</p>

      <ImmortalizeTrip locale={locale} />
      <TopSelfies locale={locale} />
    </div>
  );
}
