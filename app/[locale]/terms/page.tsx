import { Site } from "@/components/Site";
import { t } from "@/lib/copy";
import { requirePrefixedLocale } from "@/lib/prefixed";
import { terms } from "@/lib/terms";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await requirePrefixedLocale(params);
  const c = t(locale);
  return { title: `${c.termsTitle} | Kaenz` };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await requirePrefixedLocale(params);
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
