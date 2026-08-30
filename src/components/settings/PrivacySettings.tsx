"use client";

import { useCallback, useState } from "react";
import { usePreferences } from "@/hooks/usePreferences";

export function PrivacySettings() {
  const { preferences, updatePreferences } = usePreferences();
  const [showProfile, setShowProfile] = useState(preferences.showProfile);
  const [showListings, setShowListings] = useState(preferences.showListings);
  const [saved, setSaved] = useState(false);

  const isDirty =
    showProfile !== preferences.showProfile ||
    showListings !== preferences.showListings;

  const handleSave = useCallback(async () => {
    const ok = await updatePreferences({ showProfile, showListings });
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [showProfile, showListings, updatePreferences]);

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-brand-muted/20 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Privacy</h3>
        <p className="mt-0.5 text-sm text-brand-muted dark:text-slate-400">
          Control who can see your profile and listings.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <ToggleRow
          label="Public profile"
          description="Allow other users to view your profile page, display name, and avatar."
          checked={showProfile}
          onChange={setShowProfile}
        />
        <ToggleRow
          label="Public listings"
          description="Allow other users to see that you have created or are trading specific listings."
          checked={showListings}
          onChange={setShowListings}
        />
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={!isDirty}
        className="self-start rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
      >
        {saved ? "✓ Saved" : "Save privacy settings"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toggle row
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
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-700/50">
      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>
        <p className="text-xs text-brand-muted dark:text-slate-400">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition ${
          checked ? "bg-brand-accent" : "bg-slate-300 dark:bg-slate-600"
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
