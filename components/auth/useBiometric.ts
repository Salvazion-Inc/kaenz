"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  getBiometricState,
  isBiometricEnabled,
  subscribeBiometricChanged,
} from "@/lib/auth/biometric";

export function useBiometricGate() {
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useLayoutEffect(() => {
    const sync = () => {
      const on = isBiometricEnabled();
      setEnabled(on);
      setEmail(getBiometricState()?.email || null);
      setReady(true);
    };
    sync();
    return subscribeBiometricChanged(sync);
  }, []);

  return { ready, enabled, email };
}

export function useAutoBiometricPrompt(opts: {
  active: boolean;
  run: () => void | Promise<void>;
  delayMs?: number;
}) {
  const runRef = useRef(opts.run);

  useEffect(() => {
    runRef.current = opts.run;
  }, [opts.run]);

  useEffect(() => {
    if (!opts.active) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      void runRef.current();
    }, opts.delayMs ?? 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [opts.active, opts.delayMs]);
}
