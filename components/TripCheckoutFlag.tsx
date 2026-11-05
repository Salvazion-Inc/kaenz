"use client";

import { createContext, useContext } from "react";
import type { Locale } from "@/lib/locale";

const TripCheckoutFlagContext = createContext(false);

/** Boolean only. The server env is read in DocumentShell, never in the client. */
export function TripCheckoutFlag({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <TripCheckoutFlagContext.Provider value={enabled}>
      {children}
    </TripCheckoutFlagContext.Provider>
  );
}

export function useTripCheckoutEnabled() {
  return useContext(TripCheckoutFlagContext);
}

const PAUSED_NOTICE: Record<Locale, string> = {
  en: "Payment is not open yet.",
  es: "El pago aún no está abierto.",
  fr: "Le paiement n’est pas encore ouvert.",
  it: "Il pagamento non è ancora aperto.",
  pt: "O pagamento ainda não está aberto.",
};

export function tripCheckoutPausedNotice(locale: Locale) {
  return PAUSED_NOTICE[locale];
}
