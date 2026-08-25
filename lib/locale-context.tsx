"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  localeMeta,
  type Locale,
} from "./locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

function persist(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  try {
    localStorage.setItem(LOCALE_COOKIE, locale);
  } catch {
    /* private mode */
  }
  document.documentElement.lang = localeMeta[locale].htmlLang;
  document.documentElement.dataset.locale = locale;
}

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    persist(next);
    setLocaleState(next);
  }, []);

  useEffect(() => {
    const hasCookie = document.cookie
      .split(";")
      .some((p) => p.trim().startsWith(`${LOCALE_COOKIE}=`));
    if (!hasCookie) {
      try {
        const stored = localStorage.getItem(LOCALE_COOKIE);
        if (isLocale(stored) && stored !== locale) {
          persist(stored);
          setLocaleState(stored);
          return;
        }
      } catch {
        /* ignore */
      }
    }
    persist(locale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
