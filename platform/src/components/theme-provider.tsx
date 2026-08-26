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

type Theme = "light" | "dark";
type FontSize = "s" | "m" | "l" | "xl";
type Lang = "en" | "ar" | "ko";

interface ThemeContextValue {
  theme: Theme;
  fontSize: FontSize;
  lang: Lang;
  setTheme: (t: Theme) => void;
  cycleFontSize: () => void;
  cycleLang: () => void;
  setLang: (l: Lang) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const FONT_ORDER: FontSize[] = ["s", "m", "l", "xl"];
const LANG_ORDER: Lang[] = ["en", "ar", "ko"];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [fontSize, setFontSizeState] = useState<FontSize>("m");
  const [lang, setLangState] = useState<Lang>("en");

  // Hydrate from localStorage on mount
  useEffect(() => {
    const t = (localStorage.getItem("us_theme") as Theme | null) ?? "dark";
    const f = (localStorage.getItem("us_fs") as FontSize | null) ?? "m";
    const l =
      (localStorage.getItem("us_lang") as Lang | null) ??
      (navigator.language.startsWith("ar")
        ? "ar"
        : navigator.language.startsWith("ko")
        ? "ko"
        : "en");
    setThemeState(t);
    setFontSizeState(f);
    setLangState(l);
  }, []);

  // Apply to <html>
  useEffect(() => {
    const html = document.documentElement;
    html.dataset.theme = theme;
    html.dataset.fontsize = fontSize;
    html.lang = lang;
    html.dir = lang === "ar" ? "rtl" : "ltr";
    const map: Record<FontSize, string> = { s: "14px", m: "15.5px", l: "17px", xl: "19px" };
    html.style.fontSize = map[fontSize];
  }, [theme, fontSize, lang]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("us_theme", t);
  }, []);

  const cycleFontSize = useCallback(() => {
    setFontSizeState((prev) => {
      const next = FONT_ORDER[(FONT_ORDER.indexOf(prev) + 1) % FONT_ORDER.length];
      localStorage.setItem("us_fs", next);
      return next;
    });
  }, []);

  const cycleLang = useCallback(() => {
    setLangState((prev) => {
      const next = LANG_ORDER[(LANG_ORDER.indexOf(prev) + 1) % LANG_ORDER.length];
      localStorage.setItem("us_lang", next);
      return next;
    });
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("us_lang", l);
  }, []);

  const value = useMemo(
    () => ({ theme, fontSize, lang, setTheme, cycleFontSize, cycleLang, setLang }),
    [theme, fontSize, lang, setTheme, cycleFontSize, cycleLang, setLang]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
