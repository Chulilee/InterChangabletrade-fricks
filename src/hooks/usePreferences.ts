"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  getUserPreferences,
  updateProfile as apiUpdateProfile,
} from "@/services/profileService";
import type { ProfileUpdate, UserPreferences } from "@/types/profile";

type Theme = "light" | "dark" | "system";

interface UsePreferencesReturn {
  preferences: UserPreferences;
  isLoading: boolean;
  /** Resolve the effective theme (resolves "system" to light/dark). */
  resolvedTheme: "light" | "dark";
  /** Update one or more preference fields. */
  updatePreferences: (update: ProfileUpdate) => Promise<boolean>;
  /** Convenience: toggle a boolean preference. */
  togglePreference: (key: keyof Pick<UserPreferences, "compactLayout" | "showProfile" | "showListings">) => Promise<boolean>;
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(theme: Theme): "light" | "dark" {
  return theme === "system" ? getSystemTheme() : theme;
}

export function usePreferences(): UsePreferencesReturn {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(getUserPreferences);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences on mount and when user changes
  useEffect(() => {
    setIsLoading(true);
    setPreferences(getUserPreferences());
    setIsLoading(false);
  }, [user]);

  // Resolve theme
  const resolvedTheme = resolveTheme(preferences.theme);

  // Apply theme class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [resolvedTheme]);

  // Listen for system theme changes when preference is "system"
  useEffect(() => {
    if (preferences.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const root = document.documentElement;
      if (mq.matches) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [preferences.theme]);

  const updatePreferences = useCallback(
    async (update: ProfileUpdate): Promise<boolean> => {
      try {
        apiUpdateProfile(update);
        setPreferences(getUserPreferences());
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  const togglePreference = useCallback(
    async (
      key: keyof Pick<UserPreferences, "compactLayout" | "showProfile" | "showListings">,
    ): Promise<boolean> => {
      return updatePreferences({ [key]: !preferences[key] } as ProfileUpdate);
    },
    [preferences, updatePreferences],
  );

  return {
    preferences,
    isLoading,
    resolvedTheme,
    updatePreferences,
    togglePreference,
  };
}
