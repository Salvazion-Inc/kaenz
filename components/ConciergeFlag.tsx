"use client";

import { createContext, useContext } from "react";

const ConciergeFlagContext = createContext(false);

export function ConciergeFlag({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <ConciergeFlagContext.Provider value={enabled}>{children}</ConciergeFlagContext.Provider>
  );
}

export function useConciergeEnabled() {
  return useContext(ConciergeFlagContext);
}
