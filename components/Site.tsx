import { Footer } from "./Footer";
import { HtmlLang } from "./HtmlLang";
import { Nav } from "./Nav";
import type { Locale } from "@/lib/locale";

export function Site({
  locale,
  children,
  transparentNav = false,
}: {
  locale: Locale;
  children: React.ReactNode;
  transparentNav?: boolean;
}) {
  return (
    <div className="min-h-screen bg-navy text-foam">
      <HtmlLang locale={locale} />
      <Nav locale={locale} />
      <main className={transparentNav ? "" : "pt-24"}>{children}</main>
      <Footer locale={locale} />
    </div>
  );
}
