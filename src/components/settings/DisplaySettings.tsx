"use client";

import { useCallback, useState } from "react";
import { usePreferences } from "@/hooks/usePreferences";
import type { ProfileUpdate } from "@/types/profile";

type Theme = "light" | "dark" | "system";

const THEME_OPTIONS: { value: Theme; label: string; description: string }[] = [
  {
    value: "light",
    label: "Light",
    description: "Always use the light theme.",
  },
  {
    value: "dark",
    label: "Dark",
    description: "Always use the dark theme.",
  },
  {
    value: "system",
    label: "System",
    description: "Follow your operating system's preference.",
  },
];

export function DisplaySettings() {
  const { preferences, resolvedTheme, updatePreferences, togglePreference } =
    usePreferences();
  const [theme, setTheme] = useState<Theme>(preferences.theme);
  const [compactLayout, setCompactLayout] = useState(preferences.compactLayout);
  const [saved, setSaved] = useState(false);

  const isDirty =
    theme !== preferences.theme ||
    compactLayout !== preferences.compactLayout;

  const handleSave = useCallback(async () => {
    const update: ProfileUpdate = { theme, compactLayout };
    const ok = await updatePreferences(update);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [theme, compactLayout, updatePreferences]);

  const handleToggleCompact = useCallback(async () => {
    const next = !compactLayout;
    setCompactLayout(next);
  }, [compactLayout]);

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-brand-muted/20 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Display</h3>
        <p className="mt-0.5 text-sm text-brand-muted dark:text-slate-400">
          Customize how the app looks and feels.
        </p>
      </div>

      {/* Theme picker */}
      <div>
        <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          Theme
        </p>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map((opt) => {
            const isActive = theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={`flex flex-col items-center gap-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "border-brand-accent bg-brand-accent/10 text-brand-accent"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:text-slate-400 dark:hover:border-slate-500"
                }`}
              >
                <ThemeIcon theme={opt.value} active={isActive} />
                <span>{opt.label}</span>
                <span className="text-xs font-normal text-brand-muted dark:text-slate-500">
                  {opt.description}
                </span>
              </button>
            );
          })}
        </div>

        {/* Current effective theme indicator */}
        <p className="mt-2 text-xs text-brand-muted dark:text-slate-500">
          Currently active:{" "}
          <span className="font-medium capitalize text-slate-700 dark:text-slate-300">
            {resolvedTheme}
          </span>
          {preferences.theme === "system" && " (from system preference)"}
        </p>
      </div>

      {/* Compact layout toggle */}
      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-700/50">
        <div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            Compact layout
          </p>
          <p className="text-xs text-brand-muted dark:text-slate-400">
            Reduce spacing and padding throughout the interface.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={compactLayout}
          onClick={handleToggleCompact}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition ${
            compactLayout ? "bg-brand-accent" : "bg-slate-300 dark:bg-slate-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              compactLayout ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={!isDirty}
        className="self-start rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
      >
        {saved ? "✓ Saved" : "Save display settings"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Theme icon (simple SVG sun/moon/monitor)
// ---------------------------------------------------------------------------

function ThemeIcon({ theme, active }: { theme: Theme; active: boolean }) {
  const cls = active
    ? "text-brand-accent"
    : "text-slate-400 dark:text-slate-500";

  if (theme === "light") {
    return (
      <svg className={`h-5 w-5 ${cls}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="5" />
        <path strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    );
  }

  if (theme === "dark") {
    return (
      <svg className={`h-5 w-5 ${cls}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  }

  // System
  return (
    <svg className={`h-5 w-5 ${cls}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path strokeLinecap="round" d="M8 21h8M12 17v4" />
    </svg>
  );
}
