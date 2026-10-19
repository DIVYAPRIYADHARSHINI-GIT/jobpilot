"use client";
// Light/dark theme. An inline script in layout.tsx applies the saved theme
// before first paint (no flash); this hook reads/toggles the html class.
import { useCallback, useSyncExternalStore } from "react";

export const THEME_KEY = "jobpilot.theme";

export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}if(t==='dark')document.documentElement.classList.add('dark');var l=localStorage.getItem('jobpilot.lang');if(l==='ta'||l==='hi')document.documentElement.lang=l}catch(e){}})();`;

const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getDark = () => document.documentElement.classList.contains("dark");

export function useTheme() {
  const dark = useSyncExternalStore(subscribe, getDark, () => false);
  const setDark = useCallback((next: boolean) => {
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      /* ignore */
    }
    listeners.forEach((l) => l());
  }, []);
  const toggle = useCallback(() => setDark(!getDark()), [setDark]);
  return { dark, toggle, setDark };
}
