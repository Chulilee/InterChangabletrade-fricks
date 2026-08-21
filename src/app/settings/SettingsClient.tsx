"use client";

import { NotificationPreferencesPanel } from "@/components/NotificationPreferences";

export function SettingsClient() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-0.5 text-sm text-brand-muted">
          Manage your notification and email preferences.
        </p>
      </div>

      <NotificationPreferencesPanel />
    </div>
  );
}
