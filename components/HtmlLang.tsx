"use client";

import { useEffect } from "react";
import type { Locale } from "@/lib/locale";

export function HtmlLang({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale === "es" ? "es" : "en";
  }, [locale]);
  return null;
}
