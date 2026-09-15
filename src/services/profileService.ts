"use client";

import type { User } from "@/types/auth";
import type {
  AvatarUploadResult,
  ProfileUpdate,
  UserPreferences,
  UserSettings,
} from "@/types/profile";
import {
  ALLOWED_AVATAR_TYPES,
  DEFAULT_PREFERENCES,
  MAX_AVATAR_SIZE,
} from "@/types/profile";

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const SETTINGS_KEY = "ict.profile.settings";
const AUTH_USER_KEY = "ict.auth.user";

// ---------------------------------------------------------------------------
// Settings persistence (localStorage)
// ---------------------------------------------------------------------------

function loadSettings(): UserSettings {
  if (typeof window === "undefined") {
    return { preferences: { ...DEFAULT_PREFERENCES }, updatedAt: new Date().toISOString() };
  }
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return { preferences: { ...DEFAULT_PREFERENCES }, updatedAt: new Date().toISOString() };
    }
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return {
      preferences: { ...DEFAULT_PREFERENCES, ...parsed.preferences },
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return { preferences: { ...DEFAULT_PREFERENCES }, updatedAt: new Date().toISOString() };
  }
}

function saveSettings(settings: UserSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function getAuthUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function saveAuthUser(user: User): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

/** Get the current user's settings and preferences. */
export function getUserSettings(): UserSettings {
  return loadSettings();
}

/** Get the current user's preferences. */
export function getUserPreferences(): UserPreferences {
  return loadSettings().preferences;
}

/** Get the current user's profile (auth user merged with settings). */
export function getProfile(): (User & { preferences: UserPreferences }) | null {
  const user = getAuthUser();
  if (!user) return null;
  const settings = loadSettings();
  return { ...user, preferences: settings.preferences };
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/** Update user preferences. Returns the updated settings. */
export function updateProfile(update: ProfileUpdate): UserSettings {
  const current = loadSettings();
  const updatedPrefs: UserPreferences = {
    ...current.preferences,
    ...(update.displayName !== undefined && { displayName: update.displayName }),
    ...(update.notificationsEnabled !== undefined && { notificationsEnabled: update.notificationsEnabled }),
    ...(update.emailNotificationsEnabled !== undefined && { emailNotificationsEnabled: update.emailNotificationsEnabled }),
    ...(update.language !== undefined && { language: update.language }),
    ...(update.theme !== undefined && { theme: update.theme }),
  };

  const newSettings: UserSettings = {
    preferences: updatedPrefs,
    updatedAt: new Date().toISOString(),
  };

  saveSettings(newSettings);

  // Also sync displayName to the auth user
  if (update.displayName !== undefined) {
    const user = getAuthUser();
    if (user) {
      saveAuthUser({ ...user, name: update.displayName });
    }
  }

  return newSettings;
}

/**
 * Upload and set a user avatar.
 * Validates file type and size, converts to a data URL, and persists it.
 */
export async function uploadAvatar(
  file: File,
): Promise<{ success: true; result: AvatarUploadResult } | { success: false; error: string }> {
  // Validate MIME type
  if (!ALLOWED_AVATAR_TYPES.includes(file.type as typeof ALLOWED_AVATAR_TYPES[number])) {
    return {
      success: false,
      error: `Invalid file type. Allowed: ${ALLOWED_AVATAR_TYPES.join(", ")}.`,
    };
  }

  // Validate size
  if (file.size > MAX_AVATAR_SIZE) {
    const maxMB = (MAX_AVATAR_SIZE / (1024 * 1024)).toFixed(0);
    return {
      success: false,
      error: `File too large. Maximum size is ${maxMB} MB.`,
    };
  }

  // Convert to data URL (client-side preview + persistence)
  const dataUrl = await fileToDataUrl(file);

  // Persist on the auth user
  const user = getAuthUser();
  if (user) {
    saveAuthUser({ ...user, avatar: dataUrl });
  }

  return {
    success: true,
    result: { dataUrl, fileName: file.name, fileSize: file.size },
  };
}

/** Remove the user's avatar. */
export function removeAvatar(): void {
  const user = getAuthUser();
  if (user && user.avatar) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { avatar, ...rest } = user;
    saveAuthUser(rest);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}
