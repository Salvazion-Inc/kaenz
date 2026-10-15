"use client";

import type { Locale } from "@/lib/locale";
import { verifySubmitMessage } from "@/lib/yacht-manage-copy";

export function VerifySubmitNote({
  locale,
  verified,
}: {
  locale: Locale;
  verified: boolean | null;
}) {
  if (verified !== false) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
    >
      {verifySubmitMessage(locale)}
    </p>
  );
}
