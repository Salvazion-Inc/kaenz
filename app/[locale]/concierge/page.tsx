import { ConciergePage } from "@/components/pages/ConciergePage";
import { requirePrefixedLocale } from "@/lib/prefixed";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await requirePrefixedLocale(params);
  return <ConciergePage locale={locale} />;
}
