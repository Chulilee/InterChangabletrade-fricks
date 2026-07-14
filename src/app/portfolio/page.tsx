import Link from "next/link";
import { getHoldings } from "@/services/assetService";
import { formatCurrency, formatNumber } from "@/lib/format";
import { ChangeBadge } from "@/components/ChangeBadge";

export const metadata = {
  title: "Portfolio · InterChangableTrade",
};

export default async function PortfolioPage() {
  const holdings = await getHoldings();
  const totalValue = holdings.reduce(
    (sum, h) => sum + h.balance * h.asset.price,
    0,
  );

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
        <p className="mt-2 text-brand-muted">
          Your holdings across the InterChangableTrade network.
        </p>
      </div>

      <div className="mb-8 rounded-xl border border-brand-muted/20 p-6">
        <p className="text-sm uppercase text-brand-muted">Total value</p>
        <p className="mt-1 text-3xl font-bold">{formatCurrency(totalValue)}</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-brand-muted/20">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-muted/5 text-brand-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Asset</th>
              <th className="px-4 py-3 font-medium">Balance</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Value</th>
              <th className="px-4 py-3 font-medium">24h</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map(({ asset, balance }) => (
              <tr
                key={asset.id}
                className="border-t border-brand-muted/10 transition hover:bg-brand-muted/5"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/assets/${asset.id}`}
                    className="font-medium hover:text-brand-accent"
                  >
                    {asset.code}
                  </Link>
                  <span className="ml-2 text-brand-muted">{asset.name}</span>
                </td>
                <td className="px-4 py-3">{formatNumber(balance)}</td>
                <td className="px-4 py-3">{formatCurrency(asset.price)}</td>
                <td className="px-4 py-3 font-medium">
                  {formatCurrency(balance * asset.price)}
                </td>
                <td className="px-4 py-3">
                  <ChangeBadge value={asset.change24h} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
