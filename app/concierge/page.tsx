import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ConciergePage } from "@/components/pages/ConciergePage";
import { conciergeEnabled } from "@/lib/concierge";
import { LOCALE_COOKIE, parseLocale } from "@/lib/locale";

export default async function Page() {
  if (!conciergeEnabled()) redirect("/");
  const jar = await cookies();
  const locale = parseLocale(jar.get(LOCALE_COOKIE)?.value);
  return <ConciergePage locale={locale} />;
}
