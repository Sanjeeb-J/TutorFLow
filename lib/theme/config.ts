/**
 * TutorFlow theme configuration.
 *
 * Single source of truth for the available themes, the localStorage
 * key, and the pre-hydration bootstrap script. This file is plain
 * TypeScript (no React, no client/server APIs) so it can be imported
 * safely from both Server Components (layout) and Client Components
 * (ThemeProvider, future theme picker).
 */

export const THEME_IDS = ["light", "dark", "indigo", "green", "rose", "amber"] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export interface ThemeMeta {
  id: ThemeId;
  /** Human-readable label shown in the future theme picker. */
  label: string;
  /** Short description of the theme's character. */
  description: string;
  /** Representative color used for the future picker swatch. */
  swatch: string;
}

export const THEMES: ThemeMeta[] = [
  {
    id: "light",
    label: "Light",
    description: "Clean, bright, academic",
    swatch: "#f8fafc",
  },
  {
    id: "dark",
    label: "Dark",
    description: "Premium dark, easy on the eyes",
    swatch: "#0a101f",
  },
  {
    id: "indigo",
    label: "Indigo",
    description: "Focused and intelligent",
    swatch: "#4f46e5",
  },
  {
    id: "green",
    label: "Green",
    description: "Fresh and calm",
    swatch: "#059669",
  },
  {
    id: "rose",
    label: "Rose",
    description: "Warm and approachable",
    swatch: "#e11d48",
  },
  {
    id: "amber",
    label: "Amber",
    description: "Warm and optimistic",
    swatch: "#b45309",
  },
];

export const DEFAULT_THEME: ThemeId = "dark";

/** Namespaced localStorage key. Never accessed outside this module. */
export const THEME_STORAGE_KEY = "tf:theme";

export function isTheme(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}

/**
 * Tiny pre-hydration bootstrap script body (no wrapper IIFE needed —
 * the string is inserted verbatim into a <script> tag).
 *
 * Runs before React hydrates and before first paint, so the correct
 * theme is applied with no light->dark flash. Requirements:
 *  - reads the namespaced localStorage key
 *  - validates the value against the allowed theme list
 *  - fails safely to the default theme if localStorage is unavailable
 *  - touches nothing else (no fetch, no secrets)
 */
export function getThemeBootstrapScript(): string {
  const allowed = JSON.stringify(THEME_IDS);
  const fallback = JSON.stringify(DEFAULT_THEME);
  const storageKey = JSON.stringify(THEME_STORAGE_KEY);
  return [
    "(function(){",
    "try{",
    `var k=${storageKey};`,
    `var allowed=${allowed};`,
    "var t=localStorage.getItem(k);",
    `if(allowed.indexOf(t)===-1){t=${fallback};}`,
    'document.documentElement.setAttribute("data-theme",t);',
    "}catch(e){",
    `document.documentElement.setAttribute("data-theme",${fallback});`,
    "}",
    "})();",
  ].join("");
}

/** SSR mirror of the bootstrap script’s theme resolution.
 * Uses the same allowed list and fallback so the server can render
 * <html data-theme> with the value the client would compute, avoiding
 * a hydration mismatch.
 *
 * NOTE: This is only valid in server/client-aligned contexts. It intentionally
 * does not read localStorage on the server; any theme preference is applied
 * from the client-side bootstrap and ThemeProvider after hydration.
 */
export function resolveInitialTheme(): ThemeId {
  return DEFAULT_THEME;
}
