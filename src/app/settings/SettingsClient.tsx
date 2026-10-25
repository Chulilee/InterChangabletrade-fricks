"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NotificationPreferencesPanel } from "@/components/NotificationPreferences";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import {
  updateProfile as apiUpdateProfile,
  getUserPreferences,
} from "@/services/profileService";
import type { ProfileUpdate, UserPreferences } from "@/types/profile";

interface SettingsSectionProps {
  preferences: UserPreferences;
  onUpdate: (update: ProfileUpdate) => Promise<boolean>;
  saving: boolean;
}

function themeLabel(theme: string): string {
  switch (theme) {
    case "dark":
      return "Dark";
    case "light":
      return "Light";
    default:
      return "System";
  }
}

function AccountSection({
  preferences,
  onUpdate,
  saving,
}: SettingsSectionProps) {
  const [displayName, setDisplayName] = useState(preferences.displayName);
  const [theme, setTheme] = useState(preferences.theme);
  const [compactLayout, setCompactLayout] = useState(preferences.compactLayout);

  const handleSave = useCallback(async () => {
    await onUpdate({
      displayName,
      theme,
      compactLayout,
    });
  }, [displayName, theme, compactLayout, onUpdate]);

  return (
    <div className="rounded-2xl border border-brand-muted/20 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">Account</h2>
      <p className="mt-1 text-sm text-brand-muted">
        Manage your display name and display preferences.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label
            htmlFor="settings-display-name"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Display name
          </label>
          <input
            id="settings-display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={120}
            placeholder="Your name"
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="settings-theme"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Theme
            </label>
            <select
              id="settings-theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value as "light" | "dark" | "system")}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-300 bg-white p-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-700">Compact layout</span>
              <span className="text-xs text-brand-muted">
                Tighter spacing throughout the app
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={compactLayout}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                compactLayout ? "bg-brand-accent" : "bg-slate-300"
              }`}
              onClick={() => setCompactLayout((prev) => !prev)}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  compactLayout ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save account settings"}
        </button>
      </div>
    </div>
  );
}

function PrivacySection({
  preferences,
  onUpdate,
  saving,
}: SettingsSectionProps) {
  const [profileVisible, setProfileVisible] = useState(
    preferences.profileVisible,
  );
  const [listingsVisible, setListingsVisible] = useState(
    preferences.listingsVisible,
  );

  const handleSave = useCallback(async () => {
    await onUpdate({ profileVisible, listingsVisible });
  }, [profileVisible, listingsVisible, onUpdate]);

  return (
    <div className="rounded-2xl border border-brand-muted/20 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">Privacy</h2>
      <p className="mt-1 text-sm text-brand-muted">
        Control what other users can see about you and your listings.
      </p>

      <div className="mt-5 space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-slate-300 bg-white p-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-700">Profile visibility</span>
            <span className="text-xs text-brand-muted">
              Other users can view your profile
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={profileVisible}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
              profileVisible ? "bg-brand-accent" : "bg-slate-300"
            }`}
            onClick={() => setProfileVisible((prev) => !prev)}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                profileVisible ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-slate-300 bg-white p-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-700">Listing visibility</span>
            <span className="text-xs text-brand-muted">
              Your listings appear in marketplace search
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={listingsVisible}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
              listingsVisible ? "bg-brand-accent" : "bg-slate-300"
            }`}
            onClick={() => setListingsVisible((prev) => !prev)}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                listingsVisible ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save privacy settings"}
        </button>
      </div>
    </div>
  );
}

export function SettingsClient() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, settings, updateProfile, isLoading, error } = useProfile();
  const preferences = settings.preferences;

  const [savingSections, setSavingSections] = useState<Set<string>>(new Set());

  const isSaving = (section: string) => savingSections.has(section);

  const handleUpdate = useCallback(
    async (section: string, update: ProfileUpdate) => {
      setSavingSections((prev) => new Set([...prev, section]));
      try {
        await apiUpdateProfile(update);
      } finally {
        setSavingSections((prev) => {
          const next = new Set(prev);
          next.delete(section);
          return next;
        });
      }
    },
    [],
  );

  // Apply the selected theme to the document element so dark mode takes
  // effect immediately and persists across sessions via localStorage.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (preferences.theme === "dark") {
      root.classList.add("dark");
    } else if (preferences.theme === "light") {
      root.classList.add("light");
    }
    // "system" leaves no class; prefers-color-scheme via CSS would handle it,
    // but Tailwind's dark mode relies on the `dark` class, so we default to
    // light when set to system unless the OS prefers dark.
    else if (
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      root.classList.add("dark");
    }
  }, [preferences.theme]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-slate-500">Loading settings…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-slate-500">Please sign in to manage settings.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-0.5 text-sm text-brand-muted">
          Manage your profile and preferences.
        </p>
      </div>

      {/* Profile quick link */}
      <div className="flex items-center justify-between rounded-2xl border border-brand-muted/20 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border-2 border-brand-muted/30 bg-slate-100">
            {profile?.avatar ? (
              <img src={profile.avatar} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-bold text-slate-400">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="text-xs text-brand-muted">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/profile")}
            className="rounded-lg border border-brand-muted/30 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Edit profile
          </button>
        </div>
      </div>

      <AccountSection
        preferences={preferences}
        onUpdate={(u) => handleUpdate("account", u)}
        saving={isSaving("account")}
      />
      <PrivacySection
        preferences={preferences}
        onUpdate={(u) => handleUpdate("privacy", u)}
        saving={isSaving("privacy")}
      />
      <NotificationPreferencesPanel />
      <div className="rounded-2xl border border-brand-muted/20 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Display</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Control how the app looks and feels.
        </p>
        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-slate-300 bg-white p-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-700">Compact layout</span>
              <span className="text-xs text-brand-muted">
                Tighter spacing throughout the app
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={preferences.compactLayout}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                preferences.compactLayout ? "bg-brand-accent" : "bg-slate-300"
              }`}
              onClick={() =>
                handleUpdate("display", { compactLayout: !preferences.compactLayout })
              }
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  preferences.compactLayout ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
