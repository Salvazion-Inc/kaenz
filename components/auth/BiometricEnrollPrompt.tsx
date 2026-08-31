"use client";

import { useEffect, useState } from "react";
import {
  BiometricCancelledError,
  dismissBiometricPrompt,
  enrollBiometric,
  getBiometricCapability,
  isBiometricEnabled,
  isBiometricPromptDismissed,
} from "@/lib/auth/biometric";
import { at } from "@/lib/app-copy";
import type { Locale } from "@/lib/locale";
import { FingerprintMark } from "./FingerprintMark";

export function BiometricEnrollPrompt({ locale }: { locale: Locale }) {
  const a = at(locale).account;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (isBiometricEnabled() || isBiometricPromptDismissed()) return;
      const cap = await getBiometricCapability();
      if (!cancelled && cap.available) setOpen(true);
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!open) return null;

  async function enable() {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/biometric-token");
      if (!res.ok) {
        setOpen(false);
        return;
      }
      const data = (await res.json()) as {
        token: string;
        user: { id: string; email: string };
      };
      await enrollBiometric({
        userId: data.user.id,
        email: data.user.email,
        token: data.token,
        reason: a.biometricPromptTitle,
      });
      setOpen(false);
    } catch (err) {
      if (!(err instanceof BiometricCancelledError)) setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  function later() {
    dismissBiometricPrompt();
    setOpen(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-20 z-50 px-4 md:bottom-6 md:left-[4.5rem]">
      <div className="mx-auto flex max-w-lg items-start gap-3 rounded-2xl border border-kaenz/40 bg-navy-2 p-4 shadow-2xl">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-kaenz text-kaenz">
          <FingerprintMark size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{a.biometricPromptTitle}</p>
          <p className="mt-1 text-xs text-white/65">{a.biometricPromptBody}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={later}
              className="rounded-full border border-white/20 px-3 py-1.5 text-[11px] font-bold text-white/70"
            >
              {a.biometricPromptLater}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void enable()}
              className="rounded-full bg-kaenz px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-60"
            >
              {busy ? a.biometricProcessing : a.biometricPromptEnable}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
