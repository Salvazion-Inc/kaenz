import Image from "next/image";
import Link from "next/link";
import { Footer } from "./Footer";
import { HtmlLang } from "./HtmlLang";
import { Logo } from "./Logo";
import { Nav } from "./Nav";
import { WorldMap } from "./WorldMap";
import { t } from "@/lib/copy";
import { pathFor, type Locale } from "@/lib/locale";
import { yachts } from "@/lib/yachts";

const FEATURE_HREFS = [
  "/app?add=marina",
  "/app/yachts?add=yacht",
  "/app/trip",
  "/app/crew",
  "/app/account",
] as const;

const TESTIMONIAL_PHOTOS: Record<string, string> = {
  "Mia Lee": "/crew/mia.jpg",
  "William Brown": "/crew/william.jpg",
  "Emily Johnson": "/crew/emily.jpg",
};

export function HomePage({ locale }: { locale: Locale }) {
  const c = t(locale);
  const featured = yachts.slice(0, 3);

  return (
    <div className="bg-navy text-foam">
      <HtmlLang locale={locale} />
      <Nav locale={locale} />
      <section className="relative min-h-screen overflow-hidden">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster="/hero-poster.jpg"
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>
        <div className="hero-veil absolute inset-0" />
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 pb-16 pt-28 text-center">
          <div className="relative mb-1 flex items-center justify-center">
            <span
              aria-hidden
              className="pointer-events-none absolute h-52 w-52 rounded-full bg-kaenz/25 blur-3xl md:h-64 md:w-64"
            />
            <Logo
              size={256}
              className="relative h-44 w-44 mix-blend-screen drop-shadow-[0_0_48px_rgba(0,161,214,0.55)] sm:h-52 sm:w-52 md:h-56 md:w-56"
            />
          </div>
          <h1 className="hero-title mt-4 max-w-5xl text-4xl font-extrabold leading-[1.05] text-white md:text-6xl lg:text-7xl">
            {c.heroTitle}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/80 md:text-lg">
            {c.heroLead}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href={pathFor(locale, "/app")} className="btn-kaenz text-base">
              {c.heroCta}
            </Link>
            <Link href={pathFor(locale, "/fleet")} className="btn-ghost text-base">
              {c.heroSecondary}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-24">
        <p className="kaenz-kicker">{c.platformEyebrow}</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">
          {c.platformTitle}
        </h2>
        <p className="mt-4 max-w-2xl text-white/70">{c.platformLead}</p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {c.platformFeatures.map((item, i) => (
            <Link
              key={item.title}
              href={pathFor(locale, FEATURE_HREFS[i] ?? "/app")}
              className="kaenz-card kaenz-card-hover flex flex-col p-7"
            >
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-kaenz">
                0{i + 1}
              </p>
              <h3 className="mt-3 text-xl font-bold">{item.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-white/70">
                {item.body}
              </p>
              <span className="mt-6 text-sm font-bold text-kaenz">
                {item.cta} →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8">
        <p className="kaenz-kicker">{c.solveEyebrow}</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">
          {c.solveLead}
        </h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {c.pillars.map((p) => (
            <article key={p.title} className="kaenz-card p-8">
              <h3 className="text-2xl font-bold text-kaenz">{p.title}</h3>
              <p className="mt-4 text-white/80">{p.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-24">
        <p className="kaenz-kicker">{c.tripTypesTitle}</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight md:text-4xl">
          {c.tripTypesLead}
        </h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {c.tripTypes.map((p) => (
            <article key={p.title} className="kaenz-card p-8">
              <h3 className="text-2xl font-bold text-kaenz">{p.title}</h3>
              <p className="mt-4 text-white/80">{p.body}</p>
            </article>
          ))}
        </div>
        <div className="kaenz-card mt-10 border-kaenz/35 bg-kaenz/10 p-8">
          <h3 className="text-2xl font-bold">{c.pricingTitle}</h3>
          <p className="mt-4 max-w-4xl leading-relaxed text-white/85">
            {c.pricingBody}
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden">
        <Image
          src="/site/yacht-dusk.jpg"
          alt=""
          fill
          className="object-cover opacity-30"
        />
        <div className="relative mx-auto max-w-4xl px-5 py-28 text-center">
          <h2 className="text-4xl font-extrabold tracking-tight md:text-5xl">
            {c.uniqueTitle}
          </h2>
          <p className="mt-8 text-lg leading-relaxed text-white/90">
            {c.uniqueBody}{" "}
            <Link href={c.termsHref} className="underline decoration-kaenz">
              {c.uniqueTerms}
            </Link>
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-24">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              {c.fleetTitle}
            </h2>
            <p className="mt-2 text-white/70">{c.fleetLead}</p>
          </div>
          <Link
            href={pathFor(locale, "/fleet")}
            className="hidden font-semibold text-kaenz md:block"
          >
            {c.nav.fleet} →
          </Link>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {featured.map((y) => (
            <Link
              key={y.id}
              href={pathFor(locale, `/fleet/${y.id}`)}
              className="kaenz-card kaenz-card-hover group overflow-hidden"
            >
              <div className="relative h-52">
                <Image
                  src={y.image}
                  alt={y.name}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <p className="text-xs uppercase tracking-widest text-kaenz">
                  {y.traits.map((t) => t[0].toUpperCase() + t.slice(1)).join(" · ")}
                  {` · ${y.guests} ${c.guests}`}
                </p>
                <h3 className="mt-1 text-xl font-bold">{y.name}</h3>
                <p className="mt-2 text-sm text-white/70">{y.blurb[locale]}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden">
        <Image
          src="/site/crew-lifestyle.jpg"
          alt=""
          fill
          className="object-cover opacity-25"
        />
        <div className="relative mx-auto max-w-3xl px-5 py-28 text-center">
          <p className="kaenz-kicker">{c.platformFeatures[3].title}</p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight md:text-5xl">
            {c.crewSiteTitle}
          </h2>
          <p className="mt-6 text-lg text-white/80">{c.crewSiteLead}</p>
          <Link
            href={pathFor(locale, "/app/crew")}
            className="btn-kaenz mt-10 text-base"
          >
            {c.crewSiteCta}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-24">
        <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
          {c.testimonialsTitle}
        </h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {c.testimonials.map((item) => (
            <blockquote key={item.name} className="kaenz-card p-8">
              {TESTIMONIAL_PHOTOS[item.name] ? (
                <Image
                  src={TESTIMONIAL_PHOTOS[item.name]}
                  alt={item.name}
                  width={88}
                  height={88}
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-kaenz/50"
                />
              ) : null}
              <p className="mt-5 text-lg leading-relaxed">“{item.quote}”</p>
              <footer className="mt-6 text-sm font-semibold text-kaenz">
                {item.name} ({item.city})
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          {c.marinasTitle}
        </h2>
        <p className="mt-3 max-w-2xl text-white/70">{c.marinasBody}</p>
        <Link
          href={`${pathFor(locale, "/app")}?add=marina`}
          className="btn-kaenz mt-6 text-sm"
        >
          {c.marinasCta}
        </Link>
        <div className="kaenz-card mt-8 overflow-hidden p-2">
          <WorldMap locale={locale} variant="site" />
        </div>
      </section>

      <section className="relative overflow-hidden">
        <Image
          src="/site/captain-helm.jpg"
          alt=""
          fill
          className="object-cover opacity-25"
        />
        <div className="relative mx-auto max-w-3xl px-5 py-28 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl">
            {c.joinTitle}
          </h2>
          <p className="mt-6 text-lg text-white/80">{c.joinLead}</p>
          <Link
            href={`${pathFor(locale, "/app/yachts")}?add=yacht`}
            className="btn-kaenz mt-10 text-base"
          >
            {c.joinCta}
          </Link>
        </div>
      </section>

      <Footer locale={locale} />
    </div>
  );
}
