import { notFound } from "next/navigation";
import { isPrefixedLocale, type PrefixedLocale } from "./locale";

export async function requirePrefixedLocale(
  params: Promise<{ locale: string }>,
): Promise<PrefixedLocale> {
  const { locale } = await params;
  if (!isPrefixedLocale(locale)) notFound();
  return locale;
}
