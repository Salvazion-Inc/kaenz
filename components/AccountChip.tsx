"use client";

import { useEffect, useState } from "react";
import { t } from "@/lib/copy";
import type { Locale } from "@/lib/locale";
import type { SessionUser } from "@/lib/session";

export function AccountChip({ locale }: { locale: Locale }) {
  const c = t(locale);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setUser(data.user ?? null))
      .catch(() => setUser(null));
  }, []);

  if (!user) return null;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-[9rem] truncate text-[11px] text-white/70 sm:inline">
        {user.name || user.email}
      </span>
      <button
        type="button"
        onClick={logout}
        className="rounded-full border border-white/25 px-2 py-1 text-[11px] text-white/80"
      >
        {c.nav.logout}
      </button>
    </div>
  );
}
