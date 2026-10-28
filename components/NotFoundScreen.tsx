import Link from "next/link";
import { Site } from "@/components/Site";
import type { Locale } from "@/lib/locale";

export const NOT_FOUND_COPY: Record<Locale, { title: string; body: string; cta: string }> = {
  en: {
    title: "This page is not on the chart.",
    body: "The link may be old, or the page was never published.",
    cta: "Back to Kaenz",
  },
  es: {
    title: "Esta página no está en la carta.",
    body: "El enlace puede estar viejo, o la página nunca se publicó.",
    cta: "Volver a Kaenz",
  },
  fr: {
    title: "Cette page n'est pas sur la carte.",
    body: "Le lien est peut-être ancien, ou la page n'a jamais été publiée.",
    cta: "Retour à Kaenz",
  },
  it: {
    title: "Questa pagina non è sulla carta.",
    body: "Il link potrebbe essere vecchio, oppure la pagina non è mai stata pubblicata.",
    cta: "Torna a Kaenz",
  },
  pt: {
    title: "Esta página não está na carta.",
    body: "O link pode estar antigo, ou a página nunca foi publicada.",
    cta: "Voltar à Kaenz",
  },
};

export function NotFoundScreen({ locale }: { locale: Locale }) {
  const c = NOT_FOUND_COPY[locale];
  return (
    <Site locale={locale}>
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-5 pb-24 text-center">
        <p className="kaenz-kicker">404</p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight">{c.title}</h1>
        <p className="mt-4 text-white/75">{c.body}</p>
        <Link href="/" className="btn-kaenz mt-10 text-base">
          {c.cta}
        </Link>
      </div>
    </Site>
  );
}
