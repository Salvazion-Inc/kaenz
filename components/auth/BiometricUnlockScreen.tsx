"use client";

import type { ReactNode } from "react";
import { FingerprintMark } from "./FingerprintMark";

export function BiometricUnlockScreen({
  title,
  subtitle,
  status,
  email,
  busy,
  error,
  promptLabel,
  onPrompt,
  footer,
}: {
  title: string;
  subtitle: string;
  status: string;
  email?: string | null;
  busy: boolean;
  error?: string | null;
  promptLabel: string;
  onPrompt: () => void;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-sm text-center">
      <img
        src="/brand/logo-app.png"
        alt=""
        width={64}
        height={64}
        className="mx-auto mb-5 h-16 w-16 rounded-2xl ring-1 ring-kaenz/50"
      />
      <h1 className="text-2xl font-extrabold text-kaenz">{title}</h1>
      <p className="mt-1.5 text-sm text-white/70">{subtitle}</p>
      {email ? (
        <p className="mt-2 text-[11px] leading-relaxed text-white/50">{email}</p>
      ) : null}

      <button
        type="button"
        onClick={onPrompt}
        disabled={busy}
        className={`fingerprint-unlock-btn mx-auto mt-8 flex h-28 w-28 items-center justify-center rounded-full border border-kaenz bg-kaenz/15 text-kaenz transition disabled:opacity-70 ${
          busy ? "fingerprint-unlock-btn-busy" : ""
        }`}
        aria-label={promptLabel}
      >
        <FingerprintMark size={44} />
      </button>
      <p className="mt-4 text-sm font-medium text-kaenz" aria-live="polite">
        {status}
      </p>
      {error ? (
        <p role="alert" className="mt-4 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {footer ? <div className="mt-10">{footer}</div> : null}
    </div>
  );
}
