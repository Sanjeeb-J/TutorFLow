import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ThemeProvider from "@/components/ThemeProvider";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  getThemeBootstrapScript,
  isTheme,
  type ThemeId,
} from "@/lib/theme/config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TutorFlow",
  description: "A focused workspace for one-to-one tutoring",
};

/** SSR mirror of the pre-hydration bootstrap script’s theme resolution.
 * The inlined bootstrap script still runs on the client for the very
 * first paint (anti-FOUC). Because both branches use the same allowed
 * list and fallback, the <html data-theme> attribute is identical on
 * the server and the client, so React hydrates without a mismatch.
 */
function resolveInitialTheme(): ThemeId {
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    // In dev, freshly rendered server HTML should match the default
    // until the client bootstrap runs; this keeps the server/client
    // tree aligned during HMR/reload.
  }
  try {
    if (typeof localStorage === "undefined") return DEFAULT_THEME;
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && isTheme(stored)) return stored;
  } catch {
    // localStorage unavailable — fall back.
  }
  return DEFAULT_THEME;
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  const initialTheme = (typeof window !== "undefined" ? DEFAULT_THEME : resolveInitialTheme());

  return (
    <html
      lang="en"
      data-theme={initialTheme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/*
          Pre-hydration theme bootstrap. Runs before React hydrates and
          before first paint, so the saved theme is applied with no flash.
          It only reads localStorage and sets <html data-theme>.
        */}
        <script dangerouslySetInnerHTML={{ __html: getThemeBootstrapScript() }} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
