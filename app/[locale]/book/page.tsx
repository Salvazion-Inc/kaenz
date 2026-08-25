import { BookPage } from "@/components/pages/BookPage";
import { requirePrefixedLocale } from "@/lib/prefixed";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await requirePrefixedLocale(params);
  return <BookPage locale={locale} />;
}
