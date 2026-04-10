"use client";

import { useEffect } from "react";

/** Forces P-01 dark tokens on the marketing landing route. */
export function LandingTheme({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem("k-theme");
    } catch {
      stored = null;
    }
    const prev = stored ?? document.documentElement.getAttribute("data-theme") ?? "light";
    document.documentElement.setAttribute("data-theme", "dark");
    return () => {
      document.documentElement.setAttribute("data-theme", prev);
    };
  }, []);

  return <>{children}</>;
}
