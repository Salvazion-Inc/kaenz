import { HtmlLang } from "@/components/HtmlLang";

export const metadata = {
  title: "Kaenz: ¡Deja el Auto y viaja en Yate!",
  description:
    "Kaenz: “Creemos que el agua es la forma más inteligente, bella y divertida de moverse por South Florida.”",
  alternates: {
    canonical: "https://kaenz.com/es",
    languages: {
      en: "https://kaenz.com",
      es: "https://kaenz.com/es",
    },
  },
  openGraph: {
    title: "Kaenz: ¡Deja el Auto y viaja en Yate!",
    description:
      "Kaenz: “Creemos que el agua es la forma más inteligente, bella y divertida de moverse por South Florida.”",
    url: "https://kaenz.com/es",
    locale: "es_US",
  },
};

export default function EsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div lang="es">
      <HtmlLang locale="es" />
      {children}
    </div>
  );
}
