"use client";

import { useEffect, useState } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { MetricCard } from "@/components/MetricCard";
import { ActivityChart } from "@/components/ActivityChart";
import { AnalyticsOptOut } from "@/components/AnalyticsOptOut";
import type { AnalyticsTimeRange } from "@/types/analytics";

const TIME_RANGES: AnalyticsTimeRange[] = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
];

/**
 * Client component that renders the analytics dashboard.
 * Metrics are derived from the in-memory session buffer so they reflect
 * actions taken since the page was last loaded. The dashboard auto-refreshes
 * every 30 seconds.
 */
export function AnalyticsDashboard() {
  const { metrics, refreshMetrics, track, optedOut } = useAnalytics();
  const [range, setRange] = useState<AnalyticsTimeRange>(TIME_RANGES[0]);

  // Track page view once
  useEffect(() => {
    track("page_view", { page: "/analytics" });
  }, [track]);

  // Refresh metrics when the time range changes
  useEffect(() => {
    refreshMetrics(range.days);
  }, [range, refreshMetrics]);

  // Auto-refresh every 30 s
  useEffect(() => {
    const id = setInterval(() => refreshMetrics(range.days), 30_000);
    return () => clearInterval(id);
  }, [range, refreshMetrics]);

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Analytics &amp; Metrics
          </h1>
          <p className="mt-2 text-brand-muted">
            Platform engagement and trading activity overview.
          </p>
        </div>

        {/* Time-range filter */}
        <div className="flex items-center gap-2 rounded-xl border border-brand-muted/20 p-1">
          {TIME_RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                r.days === range.days
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-brand-muted hover:text-slate-900"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Opt-out notice */}
      {optedOut && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Analytics collection is paused — the metrics below reflect your
          current session only, before opt-out was applied.
        </div>
      )}

      {/* KPI cards */}
      {metrics ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon="👛"
              label="Weekly active wallets"
              value={metrics.weeklyActiveUsers}
              description={`Last ${range.days} days`}
            />
            <MetricCard
              icon="🔁"
              label="Trades completed"
              value={metrics.tradesCompleted}
              description="On-chain DEX transactions"
            />
            <MetricCard
              icon="🏷️"
              label="Listings viewed"
              value={metrics.listingsViewed}
              description="Asset detail page views"
            />
            <MetricCard
              icon="🤝"
              label="Matches proposed"
              value={metrics.matchesProposed}
              description="Off-chain routing events"
            />
          </div>

          {/* Charts row */}
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <ActivityChart
              data={metrics.dailyActivity}
              series="trades"
              label="Completed trades"
            />
            <ActivityChart
              data={metrics.dailyActivity}
              series="activeUsers"
              label="Active wallets"
            />
            <ActivityChart
              data={metrics.dailyActivity}
              series="listings"
              label="Listings viewed"
            />
          </div>
        </>
      ) : (
        <div className="mt-8 grid animate-pulse gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-slate-100"
              aria-hidden="true"
            />
          ))}
        </div>
      )}

      {/* Settings section */}
      <div className="mt-10">
        <h2 className="mb-4 text-xl font-semibold tracking-tight">
          Privacy settings
        </h2>
        <AnalyticsOptOut />
      </div>
    </section>
  );
}
