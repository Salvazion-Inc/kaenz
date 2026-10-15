"use client";

import { disableBiometric } from "@/lib/auth/biometric";

export function LogoutForm({ label, className }: { label: string; className: string }) {
  return (
    <form
      action="/api/auth/logout"
      method="post"
      onSubmit={() => {
        try {
          disableBiometric();
        } catch {
          /* The browser still posts the form and clears the session. */
        }
      }}
    >
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}
