"use client";

import Link from "next/link";
import { LiveRouteMap } from "./LiveRouteMap";
import {
  IconAccount,
  IconCrew,
  IconPin,
  IconTrip,
  IconYacht,
} from "./app/icons";
import { t } from "@/lib/copy";
import { at } from "@/lib/app-copy";
import { pathFor, type Locale } from "@/lib/locale";
import { DEMO_DEST_ID, DEMO_ORIGIN_ID } from "@/lib/live-route";
import { placeById } from "@/lib/places";

export function AppPhonePreview({ locale }: { locale: Locale }) {
  const c = t(locale);
  const a = at(locale);
  const origin = placeById(DEMO_ORIGIN_ID);
  const destination = placeById(DEMO_DEST_ID);
  if (!origin || !destination) return null;

  const tabs = [
    { id: "places", Icon: IconPin, label: a.tabs.places },
    { id: "yachts", Icon: IconYacht, label: a.tabs.yachts },
    { id: "trip", Icon: IconTrip, label: a.tabs.trip },
    { id: "crew", Icon: IconCrew, label: a.tabs.crew },
    { id: "account", Icon: IconAccount, label: a.tabs.account },
  ] as const;

  return (
    <div className="flex flex-col items-center">
      <p className="kaenz-kicker">{c.appPreviewEyebrow}</p>
      <h3 className="mt-3 max-w-sm text-center text-2xl font-bold tracking-tight md:text-3xl">
        {c.appPreviewTitle}
      </h3>
      <p className="mt-3 max-w-sm text-center text-sm text-white/70">
        {c.appPreviewLead}
      </p>
      <div className="phone-bezel mt-8">
        <div className="phone-notch" />
        <div className="flex items-center justify-between px-4 pb-1 pt-3">
          <div>
            <p className="text-[11px] font-bold leading-none">{a.appName}</p>
            <p className="mt-1 text-[10px] text-kaenz">{origin.city}</p>
          </div>
          <span className="rounded-full bg-kaenz/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-kaenz">
            {c.liveBadge}
          </span>
        </div>
        <div className="px-2">
          <LiveRouteMap
            origin={origin}
            destination={destination}
            locale={locale}
            loop
            className="h-[22rem] rounded-2xl"
          />
        </div>
        <div className="mt-2 grid grid-cols-5 border-t border-white/10 px-1 pb-2 pt-1.5">
          {tabs.map(({ id, Icon, label }) => (
            <div
              key={id}
              className={`flex flex-col items-center gap-0.5 py-1 text-[8px] font-semibold ${
                id === "trip" ? "text-kaenz" : "text-white/45"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </div>
          ))}
        </div>
      </div>
      <Link href={pathFor(locale, "/app")} className="btn-kaenz mt-8 text-sm">
        {c.appPreviewCta}
      </Link>
    </div>
  );
}
