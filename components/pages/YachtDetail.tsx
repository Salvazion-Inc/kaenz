import Image from "next/image";
import { BookForm } from "@/components/BookForm";
import { Site } from "@/components/Site";
import { t } from "@/lib/copy";
import type { Locale } from "@/lib/locale";
import { formatUsd, type Yacht } from "@/lib/yachts";

export function YachtDetail({
  locale,
  yacht,
}: {
  locale: Locale;
  yacht: Yacht;
}) {
  const c = t(locale);
  return (
    <Site locale={locale}>
      <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-24 md:grid-cols-2">
        <div>
          <div className="relative h-80 overflow-hidden rounded-2xl">
            <Image
              src={yacht.image}
              alt={yacht.name}
              fill
              className="object-cover"
              priority
            />
          </div>
          <p className="mt-6 text-xs uppercase tracking-widest text-kaenz">
            {yacht.class} · {yacht.lengthFt} ft
          </p>
          <h1 className="mt-2 text-4xl font-extrabold">{yacht.name}</h1>
          <p className="mt-3 text-white/75">{yacht.blurb[locale]}</p>
          <ul className="mt-6 space-y-2 text-sm text-white/80">
            <li>
              {yacht.guests} {c.guests}
            </li>
            <li>
              {yacht.hoursMin}+ {c.hours}
            </li>
            <li>{yacht.marina}</li>
            <li>
              {c.from} {formatUsd(yacht.priceFrom)}
            </li>
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-2xl font-bold">{c.bookTitle}</h2>
          <BookForm locale={locale} defaultYacht={yacht.id} />
        </div>
      </section>
    </Site>
  );
}
