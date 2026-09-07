"use client";

import { useEffect } from "react";
import { getThemeBootstrapScript } from "@/lib/theme/config";

export default function ThemeBootstrap() {
  useEffect(() => {
    // Run the bootstrap script to set the theme before first paint
    const script = document.createElement("script");
    script.innerHTML = getThemeBootstrapScript();
    document.head.appendChild(script);
    // Clean up after execution
    setTimeout(() => {
      document.head.removeChild(script);
    }, 0);
  }, []);

  return null;
}
