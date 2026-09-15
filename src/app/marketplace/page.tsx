import type { Metadata } from "next";
import { MarketplaceClient } from "@/components/MarketplaceClient";

export const metadata: Metadata = {
  title: "Marketplace · InterChangableTrade",
  description: "Browse and trade tokenized assets on the InterChangableTrade network.",
};

export default function MarketplacePage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <MarketplaceClient />
    </section>
  );
}
