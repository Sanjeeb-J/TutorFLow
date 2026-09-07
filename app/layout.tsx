import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ThemeProvider from "@/components/ThemeProvider";
import ThemeBootstrap from "@/components/ThemeBootstrap";
import { DEFAULT_THEME } from "@/lib/theme/config";
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
export default function RootLayout({ children }: LayoutProps<"/">) {
  // Server always renders the default theme; the client bootstrap script
  // corrects it immediately before first paint if needed. This avoids
  // hydration mismatches while keeping FOUC-free theme switching.

  return (
    <html
      lang="en"
      data-theme={DEFAULT_THEME}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeBootstrap />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
