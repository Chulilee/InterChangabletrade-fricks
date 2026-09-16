"use client";

import { useCallback, useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { simulateEmailSend } from "@/services/notificationService";
import type {
  NotificationCategory,
  NotificationPreferences as Prefs,
} from "@/types/notification";

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  trade: "Trade completions",
  message: "Messages",
  system: "System alerts",
  order: "Order updates",
  wallet: "Wallet activity",
};

export function NotificationPreferencesPanel() {
  const { preferences, updatePreferences, push } = useNotifications();
  const [draft, setDraft] = useState<Prefs>({ ...preferences });
  const [saved, setSaved] = useState(false);

  const toggleCategory = useCallback(
    (cat: NotificationCategory) => {
      setDraft((prev) => {
        const cats = prev.emailCategories.includes(cat)
          ? prev.emailCategories.filter((c) => c !== cat)
          : [...prev.emailCategories, cat];
        return { ...prev, emailCategories: cats };
      });
      setSaved(false);
    },
    [],
  );

  const handleSave = useCallback(() => {
    updatePreferences(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [draft, updatePreferences]);

  const handleTestEmail = useCallback(async () => {
    const testNotif = push({
      category: "system",
      title: "Test notification",
      body: "This is a test email notification to verify your settings.",
      priority: "low",
    });
    const sent = await simulateEmailSend(testNotif);
    if (!sent) {
      push({
        category: "system",
        title: "Email not sent",
        body: "Enable email notifications and provide an email address first.",
        priority: "low",
      });
    }
  }, [push]);

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-brand-muted/20 bg-white p-6 shadow-sm">
      <div>
        <h3 className="font-semibold text-slate-900">Email Notifications</h3>
        <p className="mt-1 text-sm text-brand-muted">
          Choose which notifications trigger an email. You can toggle individual
          categories below.
        </p>
      </div>

      {/* Master toggle */}
      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-slate-800">Enable email notifications</p>
          <p className="text-xs text-brand-muted">Receive alerts in your inbox</p>
        </div>
        <button
          type="button"
          onClick={() => { setDraft((p) => ({ ...p, emailEnabled: !p.emailEnabled })); setSaved(false); }}
          role="switch"
          aria-checked={draft.emailEnabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
            draft.emailEnabled ? "bg-brand-accent" : "bg-slate-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              draft.emailEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Email address */}
      <div>
        <label htmlFor="notif-email" className="mb-1 block text-sm font-medium text-slate-700">
          Email address
        </label>
        <input
          id="notif-email"
          type="email"
          value={draft.email}
          onChange={(e) => { setDraft((p) => ({ ...p, email: e.target.value })); setSaved(false); }}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-brand-muted/30 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-brand-muted focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent"
        />
      </div>

      {/* Per-category toggles */}
      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Categories</p>
        <div className="flex flex-col gap-2">
          {(Object.keys(CATEGORY_LABELS) as NotificationCategory[]).map((cat) => (
            <label
              key={cat}
              className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 transition hover:bg-slate-50"
            >
              <span className="text-sm text-slate-700">{CATEGORY_LABELS[cat]}</span>
              <button
                type="button"
                role="switch"
                aria-checked={draft.emailCategories.includes(cat)}
                onClick={() => toggleCategory(cat)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                  draft.emailCategories.includes(cat) ? "bg-brand-accent" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                    draft.emailCategories.includes(cat) ? "translate-x-[18px]" : "translate-x-[3px]"
                  }`}
                />
              </button>
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          {saved ? "✓ Saved" : "Save preferences"}
        </button>
        <button
          type="button"
          onClick={handleTestEmail}
          disabled={!draft.emailEnabled || !draft.email}
          className="rounded-lg border border-brand-muted/30 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send test email
        </button>
      </div>
    </div>
  );
}
