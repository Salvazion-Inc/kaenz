import { KaenzApp } from "@/components/app/KaenzApp";
import { requirePrefixedLocale } from "@/lib/prefixed";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await requirePrefixedLocale(params);
  return <KaenzApp locale={locale} tab="trip" />;
}
