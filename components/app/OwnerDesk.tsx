"use client";

import { at } from "@/lib/app-copy";
import type { Locale } from "@/lib/locale";
import { useDispatch } from "@/lib/dispatch-store";
import { useOperator } from "@/lib/operator-store";

export function OwnerDesk({ locale }: { locale: Locale }) {
  const o = at(locale).ops;
  const { owner, yachts } = useOperator();
  const { offers } = useDispatch();
  if (!owner) return null;
  const ids = new Set(yachts.map((y) => y.id));
  const related = offers.filter(
    (offer) => ids.has(offer.yachtId) || offer.ranked.some((r) => ids.has(r.yachtId)),
  );

  return (
    <section className="kaenz-card mb-6 p-4">
      <p className="kaenz-kicker">{o.ownerDesk}</p>
      <h2 className="mt-1 text-lg font-extrabold">{o.ownerDesk}</h2>
      <p className="mt-1 text-xs text-white/65">{o.ownerLead}</p>
      {yachts.length === 0 ? (
        <p className="mt-4 text-sm text-white/55">{o.ownerLocked}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {yachts.map((yacht) => (
            <li
              key={yacht.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-navy/40 px-3 py-2"
            >
              <div>
                <p className="text-sm font-bold">{yacht.name}</p>
                <p className="text-[11px] text-white/50">
                  {yacht.marina} · {yacht.guests}
                </p>
              </div>
              <p className="text-[11px] font-bold text-kaenz">{o.ownerShare}</p>
            </li>
          ))}
        </ul>
      )}
      {related.length ? (
        <p className="mt-4 text-xs text-white/55">
          {o.offeredTo.replace("{n}", String(related.length))}
        </p>
      ) : null}
    </section>
  );
}
