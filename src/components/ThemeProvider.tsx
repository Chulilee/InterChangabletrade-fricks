"use client";

import { useEffect } from "react";
import { usePreferences } from "@/hooks/usePreferences";

/**
 * Applies the user's theme preference to the <html> element on mount.
 * Must be rendered inside AuthProvider so it can read preferences.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = usePreferences();

  // Apply theme class immediately on mount to prevent flash
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [resolvedTheme]);

  return <>{children}</>;
}
