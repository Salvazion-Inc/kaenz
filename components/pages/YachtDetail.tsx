"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CaptainAvatar } from "@/components/CaptainAvatar";
import { GuestBookForm } from "@/components/pages/GuestBookForm";
import { Site } from "@/components/Site";
import { seedRealPlaces } from "@/lib/bookable-seed";
import { t, tripKindLabel } from "@/lib/copy";
import { pathFor, type Locale } from "@/lib/locale";
import type { Place } from "@/lib/places";
import { formatUsd, type Yacht } from "@/lib/yachts";

export function YachtDetail({
  locale,
  yacht,
  canceled = false,
}: {
  locale: Locale;
  yacht: Yacht;
  canceled?: boolean;
}) {
  const c = t(locale);
  const [places, setPlaces] = useState<Place[]>(() => seedRealPlaces());
  const bookable = yacht.bookable === true;
  const kinds = (yacht.kinds || []).map((kind) => tripKindLabel(locale, kind));

  useEffect(() => {
    if (!bookable) return;
    fetch("/api/marinas")
      .then((res) => res.json())
      .then((data) => setPlaces(Array.isArray(data.places) ? data.places : []))
      .catch(() => setPlaces(seedRealPlaces()));
  }, [bookable]);

  return (
    <Site locale={locale}>
      <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-24 md:grid-cols-2">
        <div>
          <div className="relative h-80 overflow-hidden rounded-2xl">
            <Image
              src={yacht.image}
              alt={yacht.name}
              fill
              className="object-cover"
              priority
            />
            {bookable ? (
              <span className="absolute left-3 top-3 rounded-full bg-kaenz px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-navy">
                {c.bookableNow}
              </span>
            ) : (
              <span className="absolute left-3 top-3 rounded-full bg-navy/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white/80">
                {c.catalogLabel}
              </span>
            )}
          </div>
          <p className="mt-6 text-xs uppercase tracking-widest text-kaenz">
            {yacht.marina}
            {yacht.lengthFt ? ` · ${yacht.lengthFt} ft` : ""}
          </p>
          <h1 className="mt-2 text-4xl font-extrabold">{yacht.name}</h1>
          {bookable && kinds.length ? (
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-white/55">
              {kinds.join(" · ")}
            </p>
          ) : null}
          <p className="mt-3 text-white/75">{yacht.blurb[locale]}</p>
          <div className="mt-5 flex items-center gap-3">
            <CaptainAvatar
              src={yacht.captain.photo}
              name={yacht.captain.name}
              size={56}
            />
            <div>
              <p className="text-sm font-semibold">
                {c.captain}: {yacht.captain.name}
              </p>
              <p className="text-xs text-white/55">{yacht.captain.license}</p>
            </div>
          </div>
          <ul className="mt-6 space-y-2 text-sm text-white/80">
            <li>
              {c.form.guests}: {yacht.guests}
            </li>
            <li>
              {yacht.hoursMin}+ {c.hours}
            </li>
            {bookable && yacht.priceFromUsd ? (
              <li className="text-lg font-extrabold text-kaenz">
                {c.from} {formatUsd(yacht.priceFromUsd)}
              </li>
            ) : null}
          </ul>
        </div>
        <div className="kaenz-card p-5 sm:p-8">
          {canceled ? (
            <p className="mb-5 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/80">
              {c.checkoutCanceled}
            </p>
          ) : null}
          {bookable ? (
            <>
              <h2 className="text-2xl font-bold">{c.bookStripe}</h2>
              <p className="mt-3 text-white/70">{c.bookStripeLead}</p>
              <GuestBookForm locale={locale} yacht={yacht} places={places} />
              <p className="mt-6 text-center text-sm text-white/50">
                <Link
                  href={pathFor(locale, "/join")}
                  className="font-semibold text-white/70 underline-offset-4 hover:text-kaenz hover:underline"
                >
                  {c.joinAsOwner}
                </Link>
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold">{c.catalogLabel}</h2>
              <p className="mt-3 text-white/70">{c.catalogLead}</p>
              <Link
                href={pathFor(locale, "/fleet")}
                className="btn-kaenz btn-book mt-6 text-sm"
              >
                {c.seeBookable}
              </Link>
              <p className="mt-6 text-center text-sm text-white/50">
                <Link
                  href={pathFor(locale, "/join")}
                  className="font-semibold text-white/70 underline-offset-4 hover:text-kaenz hover:underline"
                >
                  {c.joinAsOwner}
                </Link>
              </p>
            </>
          )}
        </div>
      </section>
    </Site>
  );
}
