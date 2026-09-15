import { notFound } from "next/navigation";
import { getAsset } from "@/services/assetService";
import { formatCurrency, formatNumber } from "@/lib/format";
import { ChangeBadge } from "@/components/ChangeBadge";
import { TradePanel } from "@/components/TradePanel";
import { ListingViewTracker } from "@/components/ListingViewTracker";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AssetDetailPage({ params }: PageProps) {
  const { id } = await params;
  const asset = await getAsset(id);

  if (!asset) {
    notFound();
  }

  // notFound() throws, so `asset` is non-null from here on.
  // The explicit cast satisfies TypeScript when Next.js types are unavailable.
  const safeAsset = asset!;

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      {/* Silent client-side tracker — fires listing_view analytics event */}
      <ListingViewTracker assetId={safeAsset.id} assetCode={safeAsset.code} />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{safeAsset.code}</h1>
            <ChangeBadge value={safeAsset.change24h} />
          </div>
          <p className="mt-1 text-brand-muted">{safeAsset.name}</p>

          <p className="mt-6 text-4xl font-bold">{formatCurrency(safeAsset.price)}</p>

          <p className="mt-6 max-w-2xl text-brand-muted">{safeAsset.description}</p>

          <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-brand-muted/20 p-4">
              <dt className="text-xs uppercase text-brand-muted">Category</dt>
              <dd className="mt-1 font-medium capitalize">
                {safeAsset.category.replace("-", " ")}
              </dd>
            </div>
            <div className="rounded-lg border border-brand-muted/20 p-4">
              <dt className="text-xs uppercase text-brand-muted">Supply</dt>
              <dd className="mt-1 font-medium">{formatNumber(safeAsset.supply)}</dd>
            </div>
            <div className="col-span-2 rounded-lg border border-brand-muted/20 p-4 sm:col-span-1">
              <dt className="text-xs uppercase text-brand-muted">Issuer</dt>
              <dd className="mt-1 truncate font-mono text-sm" title={safeAsset.issuer}>
                {safeAsset.issuer}
              </dd>
            </div>
          </dl>
        </div>

        <div>
          <TradePanel asset={safeAsset} />
        </div>
      </div>
    </section>
  );
}
