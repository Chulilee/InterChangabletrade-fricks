import { notFound } from "next/navigation";
import { getAsset } from "@/services/assetService";
import { formatCurrency, formatNumber } from "@/lib/format";
import { ChangeBadge } from "@/components/ChangeBadge";
import { TradePanel } from "@/components/TradePanel";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AssetDetailPage({ params }: PageProps) {
  const { id } = await params;
  const asset = await getAsset(id);

  if (!asset) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{asset.code}</h1>
            <ChangeBadge value={asset.change24h} />
          </div>
          <p className="mt-1 text-brand-muted">{asset.name}</p>

          <p className="mt-6 text-4xl font-bold">{formatCurrency(asset.price)}</p>

          <p className="mt-6 max-w-2xl text-brand-muted">{asset.description}</p>

          <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-brand-muted/20 p-4">
              <dt className="text-xs uppercase text-brand-muted">Category</dt>
              <dd className="mt-1 font-medium capitalize">
                {asset.category.replace("-", " ")}
              </dd>
            </div>
            <div className="rounded-lg border border-brand-muted/20 p-4">
              <dt className="text-xs uppercase text-brand-muted">Supply</dt>
              <dd className="mt-1 font-medium">{formatNumber(asset.supply)}</dd>
            </div>
            <div className="col-span-2 rounded-lg border border-brand-muted/20 p-4 sm:col-span-1">
              <dt className="text-xs uppercase text-brand-muted">Issuer</dt>
              <dd className="mt-1 truncate font-mono text-sm" title={asset.issuer}>
                {asset.issuer}
              </dd>
            </div>
          </dl>
        </div>

        <div>
          <TradePanel asset={asset} />
        </div>
      </div>
    </section>
  );
}
