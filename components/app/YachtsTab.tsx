"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { at } from "@/lib/app-copy";
import { defaultHere, etaFromKm, haversineKm } from "@/lib/geo";
import { pathFor, type Locale } from "@/lib/locale";
import { formatUsd, yachts } from "@/lib/yachts";
import { useTrip } from "@/lib/trip-store";
import { IconBadge } from "./icons";

export function YachtsTab({ locale }: { locale: Locale }) {
  const c = at(locale);
  const { setTrip } = useTrip();
  const router = useRouter();
  const [here, setHere] = useState(defaultHere);
  const [located, setLocated] = useState(false);

  const list = useMemo(() => {
    return [...yachts]
      .map((y) => {
        const km = haversineKm(here, y);
        return { y, km, eta: etaFromKm(km) };
      })
      .sort((a, b) => a.km - b.km);
  }, [here]);

  function locate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setHere({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: c.nearby,
        });
        setLocated(true);
      },
      () => setLocated(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  function request(id: string) {
    setTrip({ yachtId: id });
    router.push(pathFor(locale, "/app/request"));
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold">{c.tabs.yachts}</h1>
      <p className="mt-1 text-sm text-white/70">{c.yachtsLead}</p>
      <button
        type="button"
        onClick={locate}
        className="mt-3 rounded-full border border-kaenz/40 px-4 py-1.5 text-xs font-bold text-kaenz"
      >
        {located ? here.label : c.useLocation}
      </button>

      <ul className="mt-5 space-y-4">
        {list.map(({ y, eta }) => (
          <li
            key={y.id}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
          >
            <div className="relative h-40">
              <Image src={y.image} alt={y.name} fill className="object-cover" />
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-navy/80 px-2 py-1 text-[10px] font-bold text-kaenz">
                <IconBadge className="h-3.5 w-3.5" />
                {c.verified}
              </span>
              <span className="absolute right-3 top-3 rounded-full bg-navy/80 px-2 py-1 text-[10px] font-bold">
                {eta} min {c.away}
              </span>
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">{y.name}</h2>
                  <p className="text-xs text-white/60">
                    {y.class} · {y.lengthFt} ft · {y.guests} {c.guests}
                  </p>
                </div>
                <p className="text-right text-sm font-bold">
                  {c.from}
                  <br />
                  {formatUsd(y.priceFrom)}
                </p>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Image
                  src={y.captain.photo}
                  alt={y.captain.name}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div className="text-xs">
                  <p className="font-semibold">{y.captain.name}</p>
                  <p className="text-white/60">
                    {y.captain.license} · {y.captain.rating} ★ · {y.captain.trips}{" "}
                    trips
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm text-white/75">{y.blurb[locale]}</p>
              <button
                type="button"
                onClick={() => request(y.id)}
                className="mt-4 w-full rounded-xl bg-kaenz py-3 text-sm font-bold text-white"
              >
                {c.requestThis}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
