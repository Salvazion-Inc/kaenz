"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Site } from "@/components/Site";
import { t } from "@/lib/copy";
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
  kind: string;
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
        if (data.error) throw new Error(data.error);
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
        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
        {receipt ? (
          <div className="kaenz-card mt-8 space-y-3 p-6 text-sm">
            <p className="text-white/70">
              {paid ? c.bookingConfirmed : c.bookingUnpaid}
            </p>
            {receipt.amount ? (
              <p className="text-2xl font-extrabold text-kaenz">
                {formatUsd(receipt.amount)} USD
              </p>
            ) : null}
            {receipt.kind ? (
              <p className="uppercase tracking-widest text-white/50">
                {receipt.kind}
              </p>
            ) : null}
            {receipt.bookingId ? (
              <p className="break-all text-white/60">
                Booking {receipt.bookingId}
              </p>
            ) : null}
            {receipt.sessionId ? (
              <p className="break-all text-white/45">{receipt.sessionId}</p>
            ) : null}
            {receipt.email ? (
              <p className="text-white/70">{receipt.email}</p>
            ) : null}
          </div>
        ) : null}
        <Link href={yachtHref} className="btn-kaenz mt-8 inline-flex text-sm">
          {c.nav.fleet}
        </Link>
      </section>
    </Site>
  );
}
