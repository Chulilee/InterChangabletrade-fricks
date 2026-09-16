"use client";

import type {
  AnalyticsEvent,
  AnalyticsEventName,
  AnalyticsMetrics,
  DailyActivityPoint,
} from "@/types/analytics";

const OPT_OUT_KEY = "ict.analytics.optout";
const MAX_BUFFERED_EVENTS = 200;

/**
 * In-memory event store shared for the current browser session.
 * In production this would be forwarded to a real analytics backend.
 */
const eventBuffer: AnalyticsEvent[] = [];

let eventCounter = 0;

function generateId(): string {
  return `evt_${Date.now()}_${(eventCounter++).toString(36)}`;
}

/** Returns true when the user has opted out of event tracking. */
export function isOptedOut(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(OPT_OUT_KEY) === "true";
}

/** Opt the current user out of analytics collection. */
export function optOut(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(OPT_OUT_KEY, "true");
}

/** Opt the current user back in to analytics collection. */
export function optIn(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(OPT_OUT_KEY);
}

/**
 * Track an analytics event.
 *
 * Events are buffered in memory and sent to the API route in a fire-and-forget
 * manner. If the user has opted out, or we are running server-side, this is
 * a no-op.
 */
export async function trackEvent(
  name: AnalyticsEventName,
  properties?: AnalyticsEvent["properties"],
): Promise<void> {
  if (typeof window === "undefined") return;
  if (isOptedOut()) return;

  const event: AnalyticsEvent = {
    id: generateId(),
    name,
    timestamp: new Date().toISOString(),
    properties,
  };

  // Keep buffer bounded
  if (eventBuffer.length >= MAX_BUFFERED_EVENTS) {
    eventBuffer.shift();
  }
  eventBuffer.push(event);

  // Fire-and-forget to our API collector
  try {
    await fetch("/api/v1/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      // Use keepalive so the request survives navigation
      keepalive: true,
    });
  } catch {
    // Analytics failures must never break the UI
  }
}

/** Return all events buffered in the current session. */
export function getBufferedEvents(): ReadonlyArray<AnalyticsEvent> {
  return eventBuffer;
}

// ---------------------------------------------------------------------------
// Client-side metrics aggregation (over the session buffer)
// Used by the dashboard when there are no server-persisted events yet.
// ---------------------------------------------------------------------------

function isoDate(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Aggregate the in-memory event buffer into {@link AnalyticsMetrics}.
 * `days` controls the rolling window (default: 7).
 */
export function aggregateMetrics(days = 7): AnalyticsMetrics {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffIso = cutoff.toISOString();

  const window = eventBuffer.filter((e) => e.timestamp >= cutoffIso);

  const uniqueWallets = new Set<string>();
  let tradesCompleted = 0;
  let listingsViewed = 0;
  let matchesProposed = 0;

  // Build per-day buckets
  const dayBuckets = new Map<
    string,
    { wallets: Set<string>; trades: number; listings: number }
  >();

  for (const event of window) {
    const date = isoDate(event.timestamp);
    if (!dayBuckets.has(date)) {
      dayBuckets.set(date, { wallets: new Set(), trades: 0, listings: 0 });
    }
    const bucket = dayBuckets.get(date)!;

    const wallet = String(event.properties?.wallet ?? event.id);
    bucket.wallets.add(wallet);
    uniqueWallets.add(wallet);

    switch (event.name) {
      case "trade_complete":
        tradesCompleted++;
        bucket.trades++;
        break;
      case "listing_view":
        listingsViewed++;
        bucket.listings++;
        break;
      case "match_propose":
        matchesProposed++;
        break;
    }
  }

  // Ensure every day in the window has an entry (fill gaps with zeros)
  const dailyActivity: DailyActivityPoint[] = [];
  for (let d = days - 1; d >= 0; d--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - d);
    const date = isoDate(dt.toISOString());
    const bucket = dayBuckets.get(date);
    dailyActivity.push({
      date,
      activeUsers: bucket?.wallets.size ?? 0,
      trades: bucket?.trades ?? 0,
      listings: bucket?.listings ?? 0,
    });
  }

  return {
    weeklyActiveUsers: uniqueWallets.size,
    listingsViewed,
    tradesCompleted,
    matchesProposed,
    dailyActivity,
  };
}
