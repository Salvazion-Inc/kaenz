"use client";

import type { ComponentType } from "react";
import type { Locale } from "@/lib/locale";
import { useLocale } from "@/lib/locale-context";

export function WithLocale<P extends { locale: Locale }>({
  Component,
  ...props
}: { Component: ComponentType<P> } & Omit<P, "locale">) {
  const { locale } = useLocale();
  const merged = { ...(props as object), locale } as P;
  return <Component {...merged} />;
}
