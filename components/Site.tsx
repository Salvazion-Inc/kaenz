import { Footer } from "./Footer";
import { HtmlLang } from "./HtmlLang";
import { Nav } from "./Nav";
import type { Locale } from "@/lib/locale";

export function Site({
  locale,
  children,
  transparentNav = false,
  signedIn = false,
  accountName = "",
}: {
  locale: Locale;
  children: React.ReactNode;
  transparentNav?: boolean;
  signedIn?: boolean;
  accountName?: string;
}) {
  return (
    <div className="min-h-screen bg-navy text-foam">
      <HtmlLang locale={locale} />
      <Nav locale={locale} signedIn={signedIn} accountName={accountName} />
      <main className={transparentNav ? "" : "pt-20"}>{children}</main>
      <Footer locale={locale} />
    </div>
  );
}
