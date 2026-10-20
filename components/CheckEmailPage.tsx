"use client";

import { VerifyEmailScreen } from "@/components/VerifyEmailScreen";
import { useLocale } from "@/lib/locale-context";
import { Site } from "./Site";

export function CheckEmailPage({ email }: { email: string }) {
  const { locale } = useLocale();
  return (
    <Site locale={locale}>
      <VerifyEmailScreen email={email} variant="check" />
    </Site>
  );
}
