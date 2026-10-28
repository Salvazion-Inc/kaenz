import { cookies } from "next/headers";
import { NotFoundScreen } from "@/components/NotFoundScreen";
import { LOCALE_COOKIE, parseLocale } from "@/lib/locale";

export default async function NotFound() {
  const jar = await cookies();
  const locale = parseLocale(jar.get(LOCALE_COOKIE)?.value);
  return <NotFoundScreen locale={locale} />;
}
