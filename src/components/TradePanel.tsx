"use client";

import { useState } from "react";
import type { Asset, TradeSide } from "@/types/asset";
import { useWallet } from "@/hooks/useWallet";
import { submitOrder } from "@/services/assetService";
import { formatCurrency } from "@/lib/format";

export function TradePanel({ asset }: { asset: Asset }) {
  const { isConnected, connect } = useWallet();
  const [side, setSide] = useState<TradeSide>("buy");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const parsedAmount = Number(amount) || 0;
  const total = parsedAmount * asset.price;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isConnected) {
      await connect();
      return;
    }
    setStatus("Submitting…");
    const { id } = await submitOrder({
      assetId: asset.id,
      side,
      amount: parsedAmount,
      price: asset.price,
    });
    setStatus(`Order ${id} submitted.`);
    setAmount("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-brand-muted/20 p-5"
    >
      <div className="mb-4 grid grid-cols-2 overflow-hidden rounded-lg border border-brand-muted/20">
        {(["buy", "sell"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setSide(option)}
            className={`py-2 text-sm font-medium capitalize transition ${
              side === option
                ? "bg-brand-accent text-white"
                : "text-brand-muted hover:bg-brand-muted/10"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <label className="block text-sm font-medium text-brand-muted">
        Amount ({asset.code})
        <input
          type="number"
          min="0"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="mt-1 w-full rounded-lg border border-brand-muted/30 bg-transparent px-3 py-2 outline-none focus:border-brand-accent"
        />
      </label>

      <div className="mt-4 flex justify-between text-sm text-brand-muted">
        <span>Estimated total</span>
        <span className="font-medium text-brand">{formatCurrency(total)}</span>
      </div>

      <button
        type="submit"
        className="mt-4 w-full rounded-lg bg-brand-accent py-3 font-medium text-white transition hover:opacity-90"
      >
        {isConnected ? `${side === "buy" ? "Buy" : "Sell"} ${asset.code}` : "Connect wallet to trade"}
      </button>

      {status && (
        <p className="mt-3 text-center text-sm text-brand-muted">{status}</p>
      )}
    </form>
  );
}
