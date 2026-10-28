/** User profile types for the InterChangableTrade platform. */

export interface UserPreferences {
  /** Display name shown across the app. */
  displayName: string;
  /** Whether to receive in-app notifications. */
  notificationsEnabled: boolean;
  /** Whether to receive email notifications. */
  emailNotificationsEnabled: boolean;
  /** Preferred language (BCP 47 tag). */
  language: string;
  /** Theme preference. */
  theme: "light" | "dark" | "system";
  /** Use a compact layout density across the app. */
  compactLayout: boolean;
  /** Whether the user's profile is visible to other users. */
  profileVisible: boolean;
  /** Whether the user's listings are visible in marketplace search. */
  listingsVisible: boolean;
}

export interface UserSettings {
  /** Profile preferences. */
  preferences: UserPreferences;
  /** ISO 8601 timestamp of last update. */
  updatedAt: string;
}

export interface ProfileUpdate {
  /** Updated display name. */
  displayName?: string;
  /** Updated notification preferences. */
  notificationsEnabled?: boolean;
  /** Updated email notification preference. */
  emailNotificationsEnabled?: boolean;
  /** Updated language. */
  language?: string;
  /** Updated theme. */
  theme?: "light" | "dark" | "system";
  /** Updated compact layout preference. */
  compactLayout?: boolean;
  /** Updated profile visibility preference. */
  profileVisible?: boolean;
  /** Updated listings visibility preference. */
  listingsVisible?: boolean;
}

export interface AvatarUploadResult {
  /** Data URL of the uploaded avatar (client-side preview). */
  dataUrl: string;
  /** Original file name. */
  fileName: string;
  /** File size in bytes. */
  fileSize: number;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  displayName: "",
  notificationsEnabled: true,
  emailNotificationsEnabled: false,
  language: "en",
  theme: "system",
  compactLayout: false,
  profileVisible: true,
  listingsVisible: true,
};

/** Maximum avatar file size in bytes (2 MB). */
export const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

/** Allowed avatar MIME types. */
export const ALLOWED_AVATAR_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type AllowedAvatarType = (typeof ALLOWED_AVATAR_TYPES)[number];
