import Image from "next/image";
import Link from "next/link";
import { CaptainAvatar } from "@/components/CaptainAvatar";
import { Site } from "@/components/Site";
import { t } from "@/lib/copy";
import { pathFor, type Locale } from "@/lib/locale";
import type { Yacht } from "@/lib/yachts";

export function YachtDetail({
  locale,
  yacht,
}: {
  locale: Locale;
  yacht: Yacht;
}) {
  const c = t(locale);
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
          </div>
          <p className="mt-6 text-xs uppercase tracking-widest text-kaenz">
            {yacht.traits.map((t) => t[0].toUpperCase() + t.slice(1)).join(" · ")}
            {` · ${yacht.lengthFt} ft`}
          </p>
          <h1 className="mt-2 text-4xl font-extrabold">{yacht.name}</h1>
          <p className="mt-3 text-white/75">{yacht.blurb[locale]}</p>
          <div className="mt-5 flex items-center gap-3">
            <CaptainAvatar
              src={yacht.captain.photo}
              name={yacht.captain.name}
              size={56}
            />
            <div>
              <p className="text-sm font-semibold">{yacht.captain.name}</p>
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
            <li>{yacht.marina}</li>
          </ul>
        </div>
        <div className="kaenz-card p-8">
          <h2 className="text-2xl font-bold">{c.nav.fleet}</h2>
          <p className="mt-3 text-white/70">{c.requestPlatformLead}</p>
          <Link
            href={pathFor(locale, "/app/yachts")}
            className="btn-kaenz mt-6 text-sm"
          >
            {c.requestPlatform}
          </Link>
        </div>
      </section>
    </Site>
  );
}
