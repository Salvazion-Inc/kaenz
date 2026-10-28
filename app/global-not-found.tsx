import "@/app/globals.css";
import { cookies } from "next/headers";
import { DocumentShell } from "@/components/DocumentShell";
import { NotFoundScreen } from "@/components/NotFoundScreen";
import { LOCALE_COOKIE, parseLocale } from "@/lib/locale";

export default async function GlobalNotFound() {
  const jar = await cookies();
  const locale = parseLocale(jar.get(LOCALE_COOKIE)?.value);
  return (
    <DocumentShell locale={locale}>
      <NotFoundScreen locale={locale} />
    </DocumentShell>
  );
}
