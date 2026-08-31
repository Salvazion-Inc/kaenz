"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { t } from "@/lib/copy";
import { YACHT_TRAITS, traitLabel, type YachtTrait } from "@/lib/listings";
import { pathFor, type Locale } from "@/lib/locale";
import { yachts } from "@/lib/yachts";

const ALL: Record<Locale, string> = {
  en: "All",
  es: "Todos",
  fr: "Tous",
  it: "Tutti",
  pt: "Todos",
};

export function FleetGrid({ locale }: { locale: Locale }) {
  const c = t(locale);
  const [klass, setKlass] = useState<"all" | YachtTrait>("all");
  const list = useMemo(
    () => yachts.filter((y) => klass === "all" || y.traits.includes(klass)),
    [klass],
  );

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setKlass("all")}
          className={`rounded-full px-4 py-1.5 text-xs font-bold ${
            klass === "all"
              ? "bg-kaenz text-white"
              : "border border-white/20 text-white/70"
          }`}
        >
          {ALL[locale]}
        </button>
        {YACHT_TRAITS.map((trait) => (
          <button
            key={trait}
            type="button"
            onClick={() => setKlass(trait)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold ${
              klass === trait
                ? "bg-kaenz text-white"
                : "border border-white/20 text-white/70"
            }`}
          >
            {traitLabel(trait, locale)}
          </button>
        ))}
      </div>
      <div className="mt-12 grid gap-8 md:grid-cols-2">
        {list.map((y) => (
          <article
            key={y.id}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
          >
            <div className="relative h-64">
              <Image
                src={y.image}
                alt={y.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="p-6">
              <p className="text-xs uppercase tracking-widest text-kaenz">
                {y.traits.map((tr) => tr[0].toUpperCase() + tr.slice(1)).join(" · ")}
                {` · ${y.lengthFt} ft · ${y.marina}`}
              </p>
              <h2 className="mt-2 text-2xl font-bold">{y.name}</h2>
              <p className="mt-2 text-white/75">{y.blurb[locale]}</p>
              <p className="mt-4 text-sm text-white/60">
                {c.form.guests}: {y.guests} · {y.hoursMin}+ {c.hours}
              </p>
              <div className="mt-6 flex items-center justify-between">
                <Link
                  href={pathFor(locale, `/fleet/${y.id}`)}
                  className="btn-kaenz !px-5 !py-2 text-sm"
                >
                  {c.bookNow}
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
