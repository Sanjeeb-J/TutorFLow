"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  DEFAULT_THEME,
  THEMES,
  THEME_STORAGE_KEY,
  isTheme,
  type ThemeId,
  type ThemeMeta,
} from "@/lib/theme/config";

interface ThemeContextValue {
  /** The currently active theme. */
  theme: ThemeId;
  /** Switch the active theme: applies instantly and persists. */
  setTheme: (theme: ThemeId) => void;
  /** Available themes (stable reference). */
  themes: ThemeMeta[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Read the theme applied by the pre-hydration bootstrap script.
 * The <html data-theme> attribute is always set (validated, defaulting
 * to "light"), so this never disagrees with the CSS on first paint.
 */
function readAppliedTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const attr = document.documentElement.getAttribute("data-theme");
  return isTheme(attr) ? attr : DEFAULT_THEME;
}

/**
 * Applies a theme to the document and persists it.
 * SSR-safe: on the server this is a no-op (the bootstrap script and
 * subsequent client calls handle the DOM).
 */
function applyTheme(next: ThemeId) {
  if (!isTheme(next)) return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // localStorage unavailable (private mode, disabled) — theme still
    // applies for this session.
  }
  document.documentElement.setAttribute("data-theme", next);
}

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<ThemeId>(readAppliedTheme);

  const setTheme = useCallback((next: ThemeId) => {
    if (!isTheme(next)) return;
    applyTheme(next);
    setThemeState(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, themes: THEMES }),
    [theme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a <ThemeProvider>.");
  }
  return ctx;
}
