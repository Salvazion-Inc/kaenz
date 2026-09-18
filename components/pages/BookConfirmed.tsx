"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Site } from "@/components/Site";
import { t, tripKindLabel } from "@/lib/copy";
import { pathFor, type Locale } from "@/lib/locale";
import { formatUsd } from "@/lib/yachts";

type Receipt = {
  paid: boolean;
  status: string;
  paymentStatus: string;
  bookingId: string;
  sessionId: string;
  amount: number;
  email: string;
  yachtId: string;
  yachtName: string;
  kind: string;
  hours: number | null;
  guests: number | null;
};

export function BookConfirmed({ locale }: { locale: Locale }) {
  const c = t(locale);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get(
      "session_id",
    );
    if (!sessionId) {
      setError(c.bookingUnpaid);
      return;
    }
    fetch(`/api/checkout?session_id=${encodeURIComponent(sessionId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error("receipt");
        setReceipt(data);
      })
      .catch(() => setError(c.formError));
  }, [c.bookingUnpaid, c.formError]);

  const paid = receipt?.paid;
  const yachtHref = receipt?.yachtId
    ? pathFor(locale, `/fleet/${receipt.yachtId}`)
    : pathFor(locale, "/fleet");

  return (
    <Site locale={locale}>
      <section className="mx-auto max-w-xl px-5 pb-24">
        <p className="kaenz-kicker">{c.bookingReceipt}</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">
          {paid ? c.bookingConfirmed : c.nav.book}
        </h1>
        {!receipt && !error ? (
          <p className="mt-4 text-white/70">{c.bookingProcessing}</p>
        ) : null}
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
        {receipt ? (
          <div className="kaenz-card mt-8 overflow-hidden">
            <div className="border-b border-white/10 bg-white/5 px-6 py-5">
              <p className="text-sm text-white/70">
                {paid ? c.bookingConfirmed : c.bookingUnpaid}
              </p>
              {receipt.amount ? (
                <p className="mt-2 text-3xl font-extrabold text-kaenz">
                  {formatUsd(receipt.amount)}
                </p>
              ) : null}
            </div>
            <dl className="space-y-3 px-6 py-5 text-sm">
              {receipt.yachtName || receipt.yachtId ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-white/50">{c.receiptYacht}</dt>
                  <dd className="font-semibold text-right">
                    {receipt.yachtName || receipt.yachtId}
                  </dd>
                </div>
              ) : null}
              {receipt.kind ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-white/50">{c.form.kind}</dt>
                  <dd className="font-semibold text-right">
                    {tripKindLabel(locale, receipt.kind)}
                  </dd>
                </div>
              ) : null}
              {receipt.hours ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-white/50">{c.receiptHours}</dt>
                  <dd className="font-semibold text-right">{receipt.hours}h</dd>
                </div>
              ) : null}
              {receipt.email ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-white/50">{c.form.email}</dt>
                  <dd className="font-semibold text-right break-all">
                    {receipt.email}
                  </dd>
                </div>
              ) : null}
              {receipt.sessionId ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-white/50">{c.receiptSession}</dt>
                  <dd className="font-mono text-xs text-white/60 text-right">
                    {receipt.sessionId}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        ) : null}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href={pathFor(locale, "/fleet")} className="btn-kaenz btn-book text-sm">
            {c.bookAnother}
          </Link>
          <Link href={yachtHref} className="btn-ghost text-sm">
            {c.nav.fleet}
          </Link>
        </div>
      </section>
    </Site>
  );
}
