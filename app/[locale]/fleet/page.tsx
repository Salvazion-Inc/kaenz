import { FleetPage } from "@/components/pages/FleetPage";
import { requirePrefixedLocale } from "@/lib/prefixed";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await requirePrefixedLocale(params);
  return <FleetPage locale={locale} />;
}
