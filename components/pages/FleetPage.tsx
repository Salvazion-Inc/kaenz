import Image from "next/image";
import Link from "next/link";
import { Site } from "@/components/Site";
import { FleetGrid } from "@/components/pages/FleetGrid";
import { t } from "@/lib/copy";
import { pathFor, type Locale } from "@/lib/locale";

export function FleetPage({ locale }: { locale: Locale }) {
  const c = t(locale);
  return (
    <Site locale={locale}>
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="relative mb-10 overflow-hidden rounded-[1.35rem]">
          <Image
            src="/site/yacht-dusk.jpg"
            alt=""
            width={1600}
            height={900}
            className="h-52 w-full object-cover md:h-72"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/30 to-transparent" />
        </div>
        <p className="kaenz-kicker">{c.nav.fleet}</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">
          {c.fleetTitle}
        </h1>
        <p className="mt-3 max-w-2xl text-white/70">{c.fleetLead}</p>
        <Link href={pathFor(locale, "/join")} className="btn-ghost mt-6 text-sm">
          {c.joinAsOwner}
        </Link>
        <FleetGrid locale={locale} />
      </section>
    </Site>
  );
}
