"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  getUserSettings,
  removeAvatar as apiRemoveAvatar,
  updateProfile as apiUpdateProfile,
  uploadAvatar as apiUploadAvatar,
} from "@/services/profileService";
import type { ProfileUpdate, UserPreferences, UserSettings } from "@/types/profile";

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

interface UseProfileReturn {
  /** The current user profile (auth user + preferences), or null if not authenticated. */
  profile: (import("@/types/auth").User & { preferences: UserPreferences }) | null;
  /** Current settings (including preferences). */
  settings: UserSettings;
  /** Whether the profile is currently being loaded. */
  isLoading: boolean;
  /** Last error message, if any. */
  error: string | null;
  /** Update profile fields. */
  updateProfile: (update: ProfileUpdate) => Promise<boolean>;
  /** Upload a new avatar. */
  uploadAvatar: (file: File) => Promise<boolean>;
  /** Remove the current avatar. */
  removeAvatar: () => void;
  /** Clear the current error. */
  clearError: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useProfile(): UseProfileReturn {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(getUserSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load profile on mount and when user changes
  useEffect(() => {
    setIsLoading(true);
    setSettings(getUserSettings());
    setIsLoading(false);
  }, [user]);

  const updateProfile = useCallback(
    async (update: ProfileUpdate): Promise<boolean> => {
      setError(null);
      try {
        const newSettings = apiUpdateProfile(update);
        setSettings(newSettings);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to update profile.";
        setError(msg);
        return false;
      }
    },
    [],
  );

  const uploadAvatar = useCallback(
    async (file: File): Promise<boolean> => {
      setError(null);
      try {
        const result = await apiUploadAvatar(file);
        if (!result.success) {
          setError(result.error);
          return false;
        }
        // Force re-read to pick up the new avatar on the auth user
        setSettings(getUserSettings());
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to upload avatar.";
        setError(msg);
        return false;
      }
    },
    [],
  );

  const removeAvatar = useCallback(() => {
    setError(null);
    apiRemoveAvatar();
    setSettings(getUserSettings());
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const profile = user
    ? { ...user, preferences: settings.preferences }
    : null;

  return {
    profile,
    settings,
    isLoading,
    error,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    clearError,
  };
}
