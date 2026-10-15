"use client";

import { useEffect, useState } from "react";
import { at } from "@/lib/app-copy";
import type { Locale } from "@/lib/locale";

type HolderStatus = {
  premium: boolean;
  reason: string;
};

/**
 * Informational access-key card under the Account wallet field.
 * Renders nothing unless the flag is on and a wallet is already saved.
 * It never blocks saving the account.
 */
export function HolderKey({
  locale,
  wallet,
}: {
  locale: Locale;
  wallet: string;
}) {
  const a = at(locale).account;
  const [status, setStatus] = useState<HolderStatus | null>(null);
  const saved = wallet.trim();

  useEffect(() => {
    if (!saved) {
      setStatus(null);
      return;
    }
    let cancelled = false;
    fetch("/api/holder-key")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: HolderStatus | null) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, [saved]);

  if (!saved || !status) return null;
  if (
    status.reason === "disabled" ||
    status.reason === "no_wallet" ||
    status.reason === "invalid_wallet"
  ) {
    return null;
  }

  const on = status.premium === true && status.reason === "holder";
  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-navy/40 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-kaenz">
        {a.holderTitle}
      </p>
      <p className="mt-1 text-sm text-white/80">{on ? a.holderOn : a.holderOff}</p>
    </div>
  );
}
