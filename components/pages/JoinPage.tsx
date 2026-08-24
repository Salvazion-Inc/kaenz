import { JoinForm } from "@/components/JoinForm";
import { Site } from "@/components/Site";
import { t } from "@/lib/copy";
import type { Locale } from "@/lib/locale";

export function JoinPage({ locale }: { locale: Locale }) {
  const c = t(locale);
  return (
    <Site locale={locale}>
      <section className="mx-auto max-w-3xl px-5 pb-24">
        <h1 className="text-4xl font-extrabold">{c.joinPageTitle}</h1>
        <p className="mt-3 text-white/70">{c.joinPageLead}</p>
        <ul className="mt-8 space-y-2 text-sm text-white/75">
          <li>
            {locale === "es"
              ? "Tarifa Kaenz: 30% del booking. Dueño 40%. Capitán 30%."
              : "Kaenz fee: 30% of the booking. Owner 40%. Captain 30%."}
          </li>
          <li>
            {locale === "es"
              ? "Capitanes: credencial USCG OUPV Six-Pack o superior y verificación de antecedentes."
              : "Captains: current USCG OUPV Six-Pack or higher, plus background check."}
          </li>
          <li>
            {locale === "es"
              ? "Dueños: registro de Florida, HIN y seguro marítimo comercial (mín. $1,000,000)."
              : "Owners: Florida registration, HIN, and commercial marine insurance (min. $1,000,000)."}
          </li>
        </ul>
        <div className="mt-10">
          <JoinForm locale={locale} />
        </div>
      </section>
    </Site>
  );
}
