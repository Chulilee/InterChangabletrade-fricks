/** Analytics & Metrics types for the InterChangableTrade platform. */

export type AnalyticsEventName =
  | 'listing_view'
  | 'listing_create'
  | 'trade_complete'
  | 'match_propose'
  | 'wallet_connect'
  | 'wallet_disconnect'
  | 'page_view';

export interface AnalyticsEvent {
  /** Unique event identifier. */
  id: string;
  /** Type of event being recorded. */
  name: AnalyticsEventName;
  /** ISO 8601 timestamp of when the event occurred. */
  timestamp: string;
  /** Optional extra context (asset id, pair, page path, etc.). */
  properties?: Record<string, string | number | boolean>;
}

/** Aggregated metrics returned by the analytics API. */
export interface AnalyticsMetrics {
  /** Weekly active unique wallet addresses. */
  weeklyActiveUsers: number;
  /** Total listings (page views on asset detail pages) in the window. */
  listingsViewed: number;
  /** Number of completed on-chain trades in the window. */
  tradesCompleted: number;
  /** Number of match-propose events in the window. */
  matchesProposed: number;
  /**
   * Daily breakdown for chart rendering.
   * Each entry represents one calendar day.
   */
  dailyActivity: DailyActivityPoint[];
}

export interface DailyActivityPoint {
  /** ISO 8601 date string (YYYY-MM-DD). */
  date: string;
  activeUsers: number;
  trades: number;
  listings: number;
}

export interface AnalyticsTimeRange {
  label: string;
  days: number;
}
