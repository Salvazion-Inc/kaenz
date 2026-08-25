"use client";

import { useEffect } from "react";
import { localeMeta, type Locale } from "@/lib/locale";

export function HtmlLang({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = localeMeta[locale].htmlLang;
    document.documentElement.dataset.locale = locale;
  }, [locale]);
  return null;
}
