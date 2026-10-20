"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GuestBookForm } from "@/components/pages/GuestBookForm";
import { VerifyEmailScreen } from "@/components/VerifyEmailScreen";
import { t } from "@/lib/copy";
import type { Locale } from "@/lib/locale";
import type { Yacht } from "@/lib/yachts";

export function BookGate({ locale, yacht }: { locale: Locale; yacht: Yacht }) {
  const c = t(locale);
  const next = `/fleet/${yacht.id}`;
  const [state, setState] = useState<"anon" | "unverified" | "verified">("anon");

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

  if (state === "unverified") {
    return <VerifyEmailScreen />;
  }
  if (state === "verified") {
    return <GuestBookForm locale={locale} yacht={yacht} places={[]} />;
  }
  const signup = `/signup?next=${encodeURIComponent(next)}`;
  const login = `/login?next=${encodeURIComponent(next)}`;
  return (
    <div className="mt-6">
      <p className="text-white/75">{c.verifyToBook}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={signup} className="btn-kaenz btn-book text-sm">
          {c.verifySignup}
        </Link>
        <Link href={login} className="btn-kaenz btn-book text-sm">
          {c.verifyLogin}
        </Link>
      </div>
    </div>
  );
}
