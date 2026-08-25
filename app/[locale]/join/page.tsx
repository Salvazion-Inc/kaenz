import { JoinPage } from "@/components/pages/JoinPage";
import { requirePrefixedLocale } from "@/lib/prefixed";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await requirePrefixedLocale(params);
  return <JoinPage locale={locale} />;
}
