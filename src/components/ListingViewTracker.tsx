"use client";

import { useEffect } from "react";
import { trackEvent } from "@/services/analyticsService";

interface ListingViewTrackerProps {
  assetId: string;
  assetCode: string;
}

/**
 * Zero-render client component — mounts silently and fires a `listing_view`
 * analytics event. Kept separate from the server page so the async page
 * component stays a React Server Component.
 */
export function ListingViewTracker({
  assetId,
  assetCode,
}: ListingViewTrackerProps) {
  useEffect(() => {
    void trackEvent("listing_view", { assetId, assetCode });
  }, [assetId, assetCode]);

  return null;
}
