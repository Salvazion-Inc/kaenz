import { HtmlLang } from "@/components/HtmlLang";
import { t } from "@/lib/copy";
import {
  languageAlternates,
  localeMeta,
  PREFIXED_LOCALES,
  SITE,
} from "@/lib/locale";
import { requirePrefixedLocale } from "@/lib/prefixed";

export const dynamicParams = false;

export function generateStaticParams() {
  return PREFIXED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await requirePrefixedLocale(params);
  const c = t(locale);
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    alternates: {
      canonical: `${SITE}/${locale}`,
      languages: languageAlternates("/"),
    },
    openGraph: {
      title: c.metaTitle,
      description: c.metaDescription,
      url: `${SITE}/${locale}`,
      locale: localeMeta[locale].ogLocale,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = await requirePrefixedLocale(params);
  return (
    <div lang={localeMeta[locale].htmlLang}>
      <HtmlLang locale={locale} />
      {children}
    </div>
  );
}
