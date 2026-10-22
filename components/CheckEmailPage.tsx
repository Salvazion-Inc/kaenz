"use client";

import { VerifyEmailScreen } from "@/components/VerifyEmailScreen";
import type { Locale } from "@/lib/locale";
import { useLocale } from "@/lib/locale-context";
import { Site } from "./Site";

export function CheckEmailPage({
  email,
  expired = false,
  locale: localeProp,
}: {
  email: string;
  expired?: boolean;
  locale?: Locale;
}) {
  const { locale: contextLocale } = useLocale();
  const locale = localeProp || contextLocale;
  return (
    <Site locale={locale}>
      <VerifyEmailScreen email={email} variant="check" expired={expired} />
    </Site>
  );
}
