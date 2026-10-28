"use client";

import { useLocale } from "@/lib/locale-context";
import { HomePage } from "./HomePage";

export function HomeScreen() {
  const { locale } = useLocale();
  return <HomePage locale={locale} />;
}
