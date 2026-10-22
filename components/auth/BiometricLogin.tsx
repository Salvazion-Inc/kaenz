"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BiometricCancelledError,
  persistBiometricVault,
  unlockWithBiometric,
} from "@/lib/auth/biometric";
import { t } from "@/lib/copy";
import type { Locale } from "@/lib/locale";
import { useBiometricGate } from "./useBiometric";

export function BiometricLogin({
  locale,
  next,
  onUsePassword,
}: {
  locale: Locale;
  next: string;
  onUsePassword: () => void;
}) {
  const c = t(locale);
  const router = useRouter();
  const { email } = useBiometricGate();
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState("");
  const loadingRef = useRef(false);

  async function handleUnlock() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError("");
    try {
      const vault = await unlockWithBiometric();
      const res = await fetch("/api/auth/biometric-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: vault.token }),
      });
      if (!res.ok) {
        setError(c.biometricExpired);
        return;
      }
      const data = (await res.json()) as {
        token?: string;
        user?: { email?: string };
      };
      persistBiometricVault(data.token || vault.token, data.user?.email || vault.email);
      router.replace(next.startsWith("/") ? next : "/app");
      router.refresh();
    } catch (err) {
      if (!(err instanceof BiometricCancelledError)) {
        setError(c.biometricFailed);
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setAttempted(true);
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{c.biometricEnter}</p>
          <p className="mt-1 text-xs text-white/60">{c.biometricLockSubtitle}</p>
          {email ? <p className="mt-1 text-[11px] text-white/45">{email}</p> : null}
        </div>
        <button
          type="button"
          onClick={onUsePassword}
          disabled={loading}
          className="shrink-0 text-xs text-white/60 hover:text-kaenz"
        >
          {c.biometricUsePassword}
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-red-300">
          {error}
        </p>
      ) : null}
      {attempted && !loading && !error ? (
        <p className="mt-2 text-xs text-white/55">{c.biometricRetry}</p>
      ) : null}
      <button
        type="button"
        onClick={() => void handleUnlock()}
        disabled={loading}
        className="mt-3 rounded-md bg-kaenz px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
      >
        {loading ? c.biometricProcessing : c.biometricEnter}
      </button>
    </div>
  );
}
