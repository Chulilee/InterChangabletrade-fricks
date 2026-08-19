"use client";

import { useAnalytics } from "@/hooks/useAnalytics";

/**
 * Toggle that lets users opt in or out of analytics tracking.
 * Reads and writes the preference from localStorage.
 */
export function AnalyticsOptOut() {
  const { optedOut, setOptOut, setOptIn } = useAnalytics();

  return (
    <div className="flex items-start gap-4 rounded-2xl border border-brand-muted/20 bg-white p-5 shadow-sm">
      <div className="flex-1">
        <p className="font-semibold text-slate-900">Usage tracking</p>
        <p className="mt-1 text-sm text-brand-muted">
          We collect anonymous event data (page views, trades, listings) to
          improve the platform. No personally identifiable information is stored.
          You can opt out at any time.
        </p>
        {optedOut && (
          <p className="mt-2 text-xs font-medium text-amber-600">
            You are currently opted out. Events are not being collected.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={optedOut ? setOptIn : setOptOut}
        aria-pressed={!optedOut}
        className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
          optedOut
            ? "border-sky-500 text-sky-600 hover:bg-sky-50"
            : "border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50"
        }`}
      >
        {optedOut ? "Opt in" : "Opt out"}
      </button>
    </div>
  );
}
