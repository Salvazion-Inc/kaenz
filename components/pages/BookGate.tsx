"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { VerifyEmailScreen } from "@/components/VerifyEmailScreen";
import { t } from "@/lib/copy";
import type { Locale } from "@/lib/locale";

export function BookGate({ locale, next }: { locale: Locale; next: string }) {
  const c = t(locale);
  const [state, setState] = useState<"loading" | "anon" | "unverified" | "verified">("loading");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data?.user) setState("anon");
        else if (!data.verified) setState("unverified");
        else setState("verified");
      })
      .catch(() => setState("anon"));
  }, []);

  if (state === "loading") {
    return <p className="mt-6 text-sm text-white/50">{c.form.sending}</p>;
  }
  if (state === "unverified") {
    return <VerifyEmailScreen />;
  }
  if (state === "verified") {
    return (
      <Link href="/app" className="btn-kaenz btn-book mt-6 text-sm">
        {c.nav.app}
      </Link>
    );
  }
  return (
    <div className="mt-6">
      <p className="text-white/75">{c.verifyToBook}</p>
      <Link
        href={`/login?next=${encodeURIComponent(next)}`}
        className="btn-kaenz btn-book mt-6 text-sm"
      >
        {c.verifyLogin}
      </Link>
    </div>
  );
}
