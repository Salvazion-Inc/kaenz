import { Site } from "@/components/Site";
import { FleetGrid } from "@/components/pages/FleetGrid";
import { t } from "@/lib/copy";
import type { Locale } from "@/lib/locale";

export function FleetPage({ locale }: { locale: Locale }) {
  const c = t(locale);
  return (
    <Site locale={locale}>
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <h1 className="text-4xl font-extrabold md:text-5xl">{c.fleetTitle}</h1>
        <p className="mt-3 text-white/70">{c.fleetLead}</p>
        <FleetGrid locale={locale} />
      </section>
    </Site>
  );
}
