import { ConciergeChat } from "@/components/ConciergeChat";
import { Site } from "@/components/Site";
import { t } from "@/lib/copy";
import type { Locale } from "@/lib/locale";

export function ConciergePage({ locale }: { locale: Locale }) {
  const c = t(locale);
  return (
    <Site locale={locale}>
      <section className="mx-auto max-w-3xl px-5 pb-24">
        <h1 className="text-4xl font-extrabold">{c.conciergeTitle}</h1>
        <p className="mt-3 text-white/70">{c.conciergeLead}</p>
        <div className="mt-8">
          <ConciergeChat locale={locale} />
        </div>
      </section>
    </Site>
  );
}
