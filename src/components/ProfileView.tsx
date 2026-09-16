"use client";

import type { User } from "@/types/auth";
import type { UserPreferences } from "@/types/profile";

interface ProfileViewProps {
  /** The user profile to display. */
  user: User & { preferences: UserPreferences };
  /** Callback to switch to edit mode. */
  onEdit: () => void;
}

const THEME_LABELS: Record<string, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export function ProfileView({ user, onEdit }: ProfileViewProps) {
  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-brand-muted/20 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Edit profile
        </button>
      </div>

      {/* Avatar + basic info */}
      <div className="flex items-center gap-5">
        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border-2 border-brand-muted/30 bg-slate-100">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={`${user.name}'s avatar`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-400">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <p className="text-base font-semibold text-slate-900">{user.name}</p>
          <p className="text-sm text-brand-muted">{user.email}</p>
        </div>
      </div>

      {/* Details */}
      <div className="grid gap-4 sm:grid-cols-2">
        <InfoRow label="Display name" value={user.preferences.displayName || user.name} />
        <InfoRow label="Language" value={user.preferences.language.toUpperCase()} />
        <InfoRow label="Theme" value={THEME_LABELS[user.preferences.theme] ?? user.preferences.theme} />
        <InfoRow
          label="Notifications"
          value={user.preferences.notificationsEnabled ? "Enabled" : "Disabled"}
        />
        <InfoRow
          label="Email notifications"
          value={user.preferences.emailNotificationsEnabled ? "Enabled" : "Disabled"}
        />
        <InfoRow
          label="Member since"
          value={new Date(user.createdAt).toLocaleDateString()}
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-brand-muted">
        {label}
      </span>
      <span className="text-sm text-slate-800">{value}</span>
    </div>
  );
}
