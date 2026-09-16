"use client";

import { useCallback, useState } from "react";
import { AvatarUpload } from "@/components/AvatarUpload";
import type { User } from "@/types/auth";
import type { ProfileUpdate, UserPreferences } from "@/types/profile";

interface ProfileEditProps {
  /** The current user profile. */
  user: User & { preferences: UserPreferences };
  /** Callback to save the profile. */
  onSave: (update: ProfileUpdate) => Promise<boolean>;
  /** Callback to upload a new avatar. */
  onUploadAvatar: (file: File) => Promise<boolean>;
  /** Callback to remove the avatar. */
  onRemoveAvatar: () => void;
  /** Callback to cancel editing. */
  onCancel: () => void;
}

interface FormErrors {
  displayName?: string;
}

export function ProfileEdit({
  user,
  onSave,
  onUploadAvatar,
  onRemoveAvatar,
  onCancel,
}: ProfileEditProps) {
  const [displayName, setDisplayName] = useState(
    user.preferences.displayName || user.name,
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    user.preferences.notificationsEnabled,
  );
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(
    user.preferences.emailNotificationsEnabled,
  );
  const [language, setLanguage] = useState(user.preferences.language);
  const [theme, setTheme] = useState<"light" | "dark" | "system">(
    user.preferences.theme,
  );

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [saved, setSaved] = useState(false);

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  const validate = useCallback((): FormErrors => {
    const errs: FormErrors = {};
    const trimmed = displayName.trim();
    if (trimmed.length === 0) {
      errs.displayName = "Display name is required.";
    } else if (trimmed.length > 50) {
      errs.displayName = "Display name must be 50 characters or fewer.";
    }
    return errs;
  }, [displayName]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSave = useCallback(async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsSaving(true);
    const ok = await onSave({
      displayName: displayName.trim(),
      notificationsEnabled,
      emailNotificationsEnabled,
      language,
      theme,
    });
    setIsSaving(false);

    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [
    displayName,
    notificationsEnabled,
    emailNotificationsEnabled,
    language,
    theme,
    onSave,
    validate,
  ]);

  const handleAvatarUpload = useCallback(
    async (file: File): Promise<boolean> => {
      setIsUploadingAvatar(true);
      const ok = await onUploadAvatar(file);
      setIsUploadingAvatar(false);
      return ok;
    },
    [onUploadAvatar],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-brand-muted/20 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Edit Profile</h2>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-brand-muted/30 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>

      {/* Avatar */}
      <AvatarUpload
        currentAvatar={user.avatar}
        onUpload={handleAvatarUpload}
        onRemove={onRemoveAvatar}
        isUploading={isUploadingAvatar}
      />

      {/* Display name */}
      <div>
        <label
          htmlFor="profile-display-name"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Display name
        </label>
        <input
          id="profile-display-name"
          type="text"
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value);
            setErrors((prev) => ({ ...prev, displayName: undefined }));
          }}
          placeholder="Your display name"
          maxLength={50}
          className={`w-full rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-brand-muted focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent ${
            errors.displayName ? "border-red-400" : "border-brand-muted/30"
          }`}
        />
        {errors.displayName && (
          <p className="mt-1 text-xs text-red-500">{errors.displayName}</p>
        )}
      </div>

      {/* Language */}
      <div>
        <label
          htmlFor="profile-language"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Language
        </label>
        <select
          id="profile-language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full rounded-lg border border-brand-muted/30 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent"
        >
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
          <option value="de">Deutsch</option>
          <option value="zh">中文</option>
          <option value="ja">日本語</option>
        </select>
      </div>

      {/* Theme */}
      <div>
        <label
          htmlFor="profile-theme"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Theme
        </label>
        <select
          id="profile-theme"
          value={theme}
          onChange={(e) =>
            setTheme(e.target.value as "light" | "dark" | "system")
          }
          className="w-full rounded-lg border border-brand-muted/30 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </div>

      {/* Notification toggles */}
      <div className="flex flex-col gap-3">
        <ToggleRow
          label="In-app notifications"
          description="Receive notifications within the app"
          checked={notificationsEnabled}
          onChange={setNotificationsEnabled}
        />
        <ToggleRow
          label="Email notifications"
          description="Receive notifications via email"
          checked={emailNotificationsEnabled}
          onChange={setEmailNotificationsEnabled}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {saved ? "✓ Saved" : isSaving ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-brand-muted/30 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toggle row sub-component
// ---------------------------------------------------------------------------

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-brand-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          checked ? "bg-brand-accent" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
