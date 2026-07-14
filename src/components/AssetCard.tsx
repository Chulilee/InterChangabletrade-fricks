import Link from "next/link";
import type { Asset } from "@/types/asset";
import { formatCurrency } from "@/lib/format";
import { ChangeBadge } from "@/components/ChangeBadge";

export function AssetCard({ asset }: { asset: Asset }) {
  return (
    <Link
      href={`/assets/${asset.id}`}
      className="group block rounded-xl border border-brand-muted/20 p-5 transition hover:border-brand-accent/50 hover:shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold">{asset.code}</p>
          <p className="text-sm text-brand-muted">{asset.name}</p>
        </div>
        <span className="rounded-md bg-brand-muted/10 px-2 py-0.5 text-xs capitalize text-brand-muted">
          {asset.category.replace("-", " ")}
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <p className="text-lg font-bold">{formatCurrency(asset.price)}</p>
        <ChangeBadge value={asset.change24h} />
      </div>
    </Link>
  );
}
