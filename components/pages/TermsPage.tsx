"use client";

import { Site } from "@/components/Site";
import { useLocale } from "@/lib/locale-context";
import { terms } from "@/lib/terms";

export function TermsPage() {
  const { locale } = useLocale();
  const copy = terms(locale);
  return (
    <Site locale={locale}>
      <article className="mx-auto max-w-3xl px-5 pb-24">
        <h1 className="text-4xl font-extrabold">{copy.title}</h1>
        <p className="mt-6 text-white/80">{copy.intro}</p>
        {copy.sections.map((s) => (
          <section key={s.heading} className="mt-10">
            <h2 className="text-xl font-bold text-kaenz">{s.heading}</h2>
            <p className="mt-3 leading-relaxed text-white/80">{s.body}</p>
          </section>
        ))}
      </article>
    </Site>
  );
}
