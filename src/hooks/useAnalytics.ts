"use client";

import { useCallback, useEffect, useState } from "react";
import {
  aggregateMetrics,
  isOptedOut,
  optIn,
  optOut,
  trackEvent,
} from "@/services/analyticsService";
import type { AnalyticsEvent, AnalyticsEventName, AnalyticsMetrics } from "@/types/analytics";

interface UseAnalyticsReturn {
  /** Track a named event with optional properties. */
  track: (
    name: AnalyticsEventName,
    properties?: AnalyticsEvent["properties"],
  ) => void;
  /** Whether the user has opted out of tracking. */
  optedOut: boolean;
  /** Opt the user out of tracking. */
  setOptOut: () => void;
  /** Opt the user back in to tracking. */
  setOptIn: () => void;
  /** Aggregated metrics over the given time window (default: 7 days). */
  metrics: AnalyticsMetrics | null;
  /** Refresh the metrics snapshot from the in-memory buffer. */
  refreshMetrics: (days?: number) => void;
}

/**
 * React hook that exposes analytics event tracking, opt-out controls,
 * and a live metrics snapshot aggregated from the session buffer.
 */
export function useAnalytics(): UseAnalyticsReturn {
  const [optedOut, setOptedOut] = useState(false);
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);

  // Read persisted opt-out preference on mount (client-only)
  useEffect(() => {
    setOptedOut(isOptedOut());
  }, []);

  const refreshMetrics = useCallback((days = 7) => {
    setMetrics(aggregateMetrics(days));
  }, []);

  // Compute initial metrics snapshot once mounted
  useEffect(() => {
    refreshMetrics();
  }, [refreshMetrics]);

  const track = useCallback(
    (name: AnalyticsEventName, properties?: AnalyticsEvent["properties"]) => {
      void trackEvent(name, properties);
    },
    [],
  );

  const handleOptOut = useCallback(() => {
    optOut();
    setOptedOut(true);
  }, []);

  const handleOptIn = useCallback(() => {
    optIn();
    setOptedOut(false);
  }, []);

  return {
    track,
    optedOut,
    setOptOut: handleOptOut,
    setOptIn: handleOptIn,
    metrics,
    refreshMetrics,
  };
}
