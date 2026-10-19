"use client";
// Tiny i18n layer: typed dictionaries, {placeholder} interpolation and locale
// number/date formatting. Language is saved in localStorage.
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import en, { type Dict, type TKey } from "./en";
import ta from "./ta";
import hi from "./hi";

export type Lang = "en" | "ta" | "hi";
export const LANGS: Lang[] = ["en", "ta", "hi"];
export const LANG_KEY = "jobpilot.lang";
const DICTS: Record<Lang, Dict> = { en, ta, hi };
const LOCALES: Record<Lang, string> = { en: "en-IN", ta: "ta-IN", hi: "hi-IN" };

export const isLang = (v: unknown): v is Lang => v === "en" || v === "ta" || v === "hi";

type Vars = Record<string, string | number>;

const langListeners = new Set<() => void>();
let currentLang: Lang | null = null;
function readLang(): Lang {
  if (currentLang) return currentLang;
  try {
    const saved = localStorage.getItem(LANG_KEY);
    currentLang = isLang(saved) ? saved : "en";
  } catch {
    currentLang = "en";
  }
  return currentLang;
}
function subscribeLang(l: () => void) {
  langListeners.add(l);
  return () => langListeners.delete(l);
}

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey, vars?: Vars) => string;
  formatNumber: (n: number) => string;
  formatDate: (d: string | number, opts?: Intl.DateTimeFormatOptions) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(subscribeLang, readLang, () => "en" as Lang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    currentLang = l;
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* ignore */
    }
    langListeners.forEach((f) => f());
  }, []);

  const value = useMemo<I18nValue>(() => {
    const dict = DICTS[lang];
    const nf = new Intl.NumberFormat(LOCALES[lang]);
    return {
      lang,
      setLang,
      t: (key, vars) => {
        const s = dict[key] ?? en[key] ?? key;
        return vars ? s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`)) : s;
      },
      formatNumber: (n) => nf.format(n),
      formatDate: (d, opts = { day: "numeric", month: "short", year: "numeric" }) => {
        const date = typeof d === "number" ? new Date(d) : new Date(d.length === 10 ? `${d}T00:00:00` : d);
        if (Number.isNaN(date.getTime())) return "";
        return new Intl.DateTimeFormat(LOCALES[lang], opts).format(date);
      },
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const v = useContext(I18nContext);
  if (!v) throw new Error("useI18n outside I18nProvider");
  return v;
}
