import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ThemeProvider from "@/components/ThemeProvider";
import { getThemeBootstrapScript } from "@/lib/theme/config";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
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
