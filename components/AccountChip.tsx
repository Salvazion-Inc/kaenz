"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { at } from "@/lib/app-copy";
import { t } from "@/lib/copy";
import { pathFor, type Locale } from "@/lib/locale";
import { useProfile } from "@/lib/profile-store";
import type { SessionUser } from "@/lib/session";

export function AccountChip({ locale }: { locale: Locale }) {
  const c = t(locale);
  const a = at(locale);
  const { profile } = useProfile();
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

  const label = profile?.fullName || user.name || user.email;

  return (
    <div className="flex items-center gap-2">
      <Link
        href={pathFor(locale, "/app/account")}
        className="hidden max-w-[11rem] truncate text-[11px] text-white/70 hover:text-white sm:inline"
      >
        {label}
        {profile?.role ? (
          <span className="text-kaenz">
            {" "}
            · {a.account.roles[profile.role].title}
          </span>
        ) : null}
      </Link>
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
