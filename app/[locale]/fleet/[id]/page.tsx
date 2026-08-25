import { YachtDetail } from "@/components/pages/YachtDetail";
import { PREFIXED_LOCALES } from "@/lib/locale";
import { requirePrefixedLocale } from "@/lib/prefixed";
import { yachts } from "@/lib/yachts";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return PREFIXED_LOCALES.flatMap((locale) =>
    yachts.map((y) => ({ locale, id: y.id })),
  );
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const locale = await requirePrefixedLocale(params);
  const { id } = await params;
  const yacht = yachts.find((y) => y.id === id);
  if (!yacht) notFound();
  return <YachtDetail locale={locale} yacht={yacht} />;
}
