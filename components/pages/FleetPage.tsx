import Image from "next/image";
import Link from "next/link";
import { Site } from "@/components/Site";
import { t } from "@/lib/copy";
import { pathFor, type Locale } from "@/lib/locale";
import { formatUsd, yachts } from "@/lib/yachts";

export function FleetPage({ locale }: { locale: Locale }) {
  const c = t(locale);
  return (
    <Site locale={locale}>
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <h1 className="text-4xl font-extrabold md:text-5xl">{c.fleetTitle}</h1>
        <p className="mt-3 text-white/70">{c.fleetLead}</p>
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {yachts.map((y) => (
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
                  {y.class} · {y.lengthFt} ft · {y.marina}
                </p>
                <h2 className="mt-2 text-2xl font-bold">{y.name}</h2>
                <p className="mt-2 text-white/75">{y.blurb[locale]}</p>
                <p className="mt-4 text-sm text-white/60">
                  {y.guests} {c.guests} · {y.hoursMin}+ {c.hours}
                </p>
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-lg font-bold">
                    {c.from} {formatUsd(y.priceFrom)}
                  </p>
                  <Link
                    href={pathFor(locale, `/fleet/${y.id}`)}
                    className="rounded-md bg-kaenz px-5 py-2 text-sm font-bold text-white"
                  >
                    {c.bookNow}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </Site>
  );
}
