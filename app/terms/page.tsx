import { Site } from "@/components/Site";
import { termsEn } from "@/lib/terms";

export const metadata = { title: "Terms and Conditions | Kaenz" };

export default function Page() {
  return (
    <Site locale="en">
      <article className="mx-auto max-w-3xl px-5 pb-24">
        <h1 className="text-4xl font-extrabold">{termsEn.title}</h1>
        <p className="mt-6 text-white/80">{termsEn.intro}</p>
        {termsEn.sections.map((s) => (
          <section key={s.heading} className="mt-10">
            <h2 className="text-xl font-bold text-kaenz">{s.heading}</h2>
            <p className="mt-3 leading-relaxed text-white/80">{s.body}</p>
          </section>
        ))}
      </article>
    </Site>
  );
}
