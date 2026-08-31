"use client";

import { at } from "@/lib/app-copy";
import type { Locale } from "@/lib/locale";
import { settleCharge, type FareQuote } from "@/lib/pricing";
import { formatUsd } from "@/lib/yachts";

export function FareCard({
  locale,
  fare,
  gratuityPct,
  marketName,
  paid,
}: {
  locale: Locale;
  fare: FareQuote;
  gratuityPct: number;
  marketName?: string;
  paid?: boolean;
}) {
  const c = at(locale);
  const charge = settleCharge(fare, gratuityPct);
  return (
    <section className="rounded-2xl bg-white p-4 text-navy">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold">{c.fare}</h3>
        {paid ? (
          <span className="rounded-full bg-kaenz/15 px-2 py-0.5 text-[11px] font-bold text-kaenz-deep">
            {c.paidWithStripe}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-[11px] text-navy/55">{c.splitLead}</p>
      {marketName ? (
        <p className="mt-1 text-[11px] text-navy/45">
          {c.marketBased}: {marketName}
        </p>
      ) : null}
      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <dt>{c.boat}</dt>
          <dd>{formatUsd(charge.fare)}</dd>
        </div>
        <div className="flex justify-between text-navy/60">
          <dt>{c.ownerShare}</dt>
          <dd>{formatUsd(charge.owner)}</dd>
        </div>
        <div className="flex justify-between text-navy/60">
          <dt>
            {charge.gratuity ? c.captainPlusTip : c.captainShare}
          </dt>
          <dd>{formatUsd(charge.captainTotal)}</dd>
        </div>
        {charge.marina.roundTrip && charge.marina.total ? (
          <div className="flex justify-between text-navy/60">
            <dt>{c.marinaRoundShare}</dt>
            <dd>{formatUsd(charge.marina.total)}</dd>
          </div>
        ) : (
          <>
            {charge.marina.origin ? (
              <div className="flex justify-between text-navy/60">
                <dt>{c.marinaPickupShare}</dt>
                <dd>{formatUsd(charge.marina.origin)}</dd>
              </div>
            ) : null}
            {charge.marina.destination ? (
              <div className="flex justify-between text-navy/60">
                <dt>{c.marinaDropoffShare}</dt>
                <dd>{formatUsd(charge.marina.destination)}</dd>
              </div>
            ) : null}
          </>
        )}
        <div className="flex justify-between text-navy/60">
          <dt>{c.platformShare}</dt>
          <dd>{formatUsd(charge.platform)}</dd>
        </div>
        {charge.gratuity ? (
          <div className="flex justify-between text-navy/60">
            <dt>{c.gratuity}</dt>
            <dd>{formatUsd(charge.gratuity)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-navy/10 pt-2 text-base font-bold">
          <dt>{c.total}</dt>
          <dd>{formatUsd(charge.total)}</dd>
        </div>
      </dl>
    </section>
  );
}
