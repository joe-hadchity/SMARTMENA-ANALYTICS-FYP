"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Locale } from "@/lib/types";

import { messages } from "./messages";

type I18nCtx = {
  locale: Locale;
  dir: "rtl" | "ltr";
  setLocale: (l: Locale) => void;
  t: (key: string, fallback?: string) => string;
};

const I18nContext = createContext<I18nCtx | null>(null);

const STORAGE_KEY = "smartmena.locale";

export function I18nProvider({
  children,
  initialLocale = "en",
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "ar" || stored === "en") {
        setLocaleState(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  const dir: "rtl" | "ltr" = locale === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key: string, fallback?: string) => {
      const dict = messages[locale];
      return dict[key] || fallback || key;
    },
    [locale],
  );

  const value = useMemo(
    () => ({ locale, dir, setLocale, t }),
    [locale, dir, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
