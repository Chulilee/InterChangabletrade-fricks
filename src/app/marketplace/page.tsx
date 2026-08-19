import { listAssets } from "@/services/assetService";
import { AssetCard } from "@/components/AssetCard";
import { Checkout } from "@/components/Checkout";

export const metadata = {
  title: "Marketplace · InterChangableTrade",
};

export default async function MarketplacePage() {
  const assets = await listAssets();

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
        <p className="mt-2 text-brand-muted">
          Browse tokenized assets available on the InterChangableTrade network.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map((asset) => (
          <AssetCard key={asset.id} asset={asset} />
        ))}
      </div>
      <div className="mt-12">
        <Checkout />
      </div>
    </section>
  );
}
