import Image from "next/image";
import Link from "next/link";
import { Footer } from "./Footer";
import { Logo } from "./Logo";
import { Nav } from "./Nav";
import { t } from "@/lib/copy";
import { pathFor, type Locale } from "@/lib/locale";
import { formatUsd, yachts } from "@/lib/yachts";

const MAP =
  "https://www.google.com/maps/d/embed?mid=1dH1tLxo5g6flVs5zjw9yLtgK3i7TdRU";

export function HomePage({ locale }: { locale: Locale }) {
  const c = t(locale);
  const featured = yachts.slice(0, 3);

  return (
    <div className="bg-navy text-foam">
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
        <div className="absolute inset-0 bg-navy/35" />
        <Nav locale={locale} />
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 text-center">
          <h1 className="hero-title max-w-5xl text-4xl font-extrabold leading-tight text-kaenz md:text-6xl lg:text-7xl">
            {c.heroTitle}
          </h1>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={pathFor(locale, "/app")}
              className="rounded-md bg-kaenz px-10 py-3 text-lg font-bold text-foam shadow-lg shadow-navy/40 transition hover:bg-kaenz-deep"
            >
              {c.heroCta}
            </Link>
            <Link
              href={pathFor(locale, "/book")}
              className="rounded-md border border-white/40 px-8 py-3 text-lg font-bold text-white backdrop-blur-sm transition hover:bg-white/10"
            >
              {c.heroSecondary}
            </Link>
          </div>
        </div>
        <div className="absolute bottom-6 left-6 z-10 hidden md:block">
          <Logo size={96} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-24">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-kaenz">
          {c.solveEyebrow}
        </p>
        <h2 className="mt-3 max-w-3xl text-3xl font-bold md:text-5xl">
          {c.solveLead}
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {c.pillars.map((p) => (
            <article
              key={p.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-8"
            >
              <h3 className="text-2xl font-bold text-kaenz">{p.title}</h3>
              <p className="mt-4 text-white/80">{p.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden">
        <Image
          src="/fleet/miami-skyline.jpg"
          alt=""
          fill
          className="object-cover opacity-30"
        />
        <div className="relative mx-auto max-w-4xl px-5 py-28 text-center">
          <h2 className="text-4xl font-extrabold md:text-5xl">{c.uniqueTitle}</h2>
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
            <h2 className="text-3xl font-bold md:text-4xl">{c.fleetTitle}</h2>
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
              className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5"
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
                  {y.class} · {y.lengthFt} ft
                </p>
                <h3 className="mt-1 text-xl font-bold">{y.name}</h3>
                <p className="mt-2 text-sm text-white/70">{y.blurb[locale]}</p>
                <p className="mt-4 font-semibold">
                  {c.from} {formatUsd(y.priceFrom)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-white text-navy">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <h2 className="text-center text-3xl font-bold md:text-4xl">
            {c.testimonialsTitle}
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {c.testimonials.map((item) => (
              <blockquote
                key={item.name}
                className="rounded-2xl border border-navy/10 bg-foam p-8"
              >
                <p className="text-lg leading-relaxed">“{item.quote}”</p>
                <footer className="mt-6 text-sm font-semibold text-kaenz-deep">
                  {item.name} ({item.city})
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-24">
        <h2 className="text-3xl font-bold md:text-4xl">{c.marinasTitle}</h2>
        <p className="mt-3 max-w-2xl text-white/70">{c.marinasBody}</p>
        <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
          <iframe
            title={c.mapTitle}
            src={MAP}
            className="h-[480px] w-full border-0"
            loading="lazy"
            allowFullScreen
          />
        </div>
      </section>

      <section className="relative overflow-hidden">
        <Image
          src="/fleet/captain.jpg"
          alt=""
          fill
          className="object-cover opacity-25"
        />
        <div className="relative mx-auto max-w-3xl px-5 py-28 text-center">
          <h2 className="text-3xl font-extrabold md:text-5xl">{c.joinTitle}</h2>
          <p className="mt-6 text-lg text-white/80">{c.joinLead}</p>
          <Link
            href={pathFor(locale, "/join")}
            className="mt-10 inline-block rounded-md bg-kaenz px-10 py-3 text-lg font-bold text-white hover:bg-kaenz-deep"
          >
            {c.joinCta}
          </Link>
        </div>
      </section>

      <Footer locale={locale} />
    </div>
  );
}
