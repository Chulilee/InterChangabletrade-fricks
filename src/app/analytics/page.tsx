import type { Metadata } from "next";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";

export const metadata: Metadata = {
  title: "Analytics · InterChangableTrade",
  description:
    "Platform engagement metrics — active wallets, trading volume, and listing activity.",
};

/**
 * Analytics & Metrics dashboard page.
 * All data rendering is delegated to the AnalyticsDashboard client component
 * so that real-time updates and browser-local opt-out preferences work correctly.
 */
export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}
