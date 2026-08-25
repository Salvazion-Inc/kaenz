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
          <li>{c.joinFee}</li>
          <li>{c.joinCaptains}</li>
          <li>{c.joinOwners}</li>
        </ul>
        <div className="mt-10">
          <JoinForm locale={locale} />
        </div>
      </section>
    </Site>
  );
}
