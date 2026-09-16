"use client";

import { useState } from "react";
import type { Asset, TradeSide } from "@/types/asset";
import { useWallet } from "@/hooks/useWallet";
import { useAnalytics } from "@/hooks/useAnalytics";
import { placeOrder } from "@/services/tradeService";
import { formatCurrency } from "@/lib/format";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; hash: string; explorerUrl: string }
  | { kind: "error"; message: string };

export function TradePanel({ asset }: { asset: Asset }) {
  const { address, isConnected, isConnecting, connect } = useWallet();
  const { track } = useAnalytics();
  const [side, setSide] = useState<TradeSide>("buy");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const parsedAmount = Number(amount) || 0;
  const total = parsedAmount * asset.price;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isConnected || !address) {
      await connect();
      return;
    }
    if (parsedAmount <= 0) return;

    setStatus({ kind: "submitting" });
    try {
      const result = await placeOrder({
        asset,
        side,
        amount: parsedAmount,
        price: asset.price,
        address,
      });
      setStatus({
        kind: "success",
        hash: result.hash,
        explorerUrl: result.explorerUrl,
      });
      track("trade_complete", {
        asset: asset.code,
        side,
        amount: parsedAmount,
        price: asset.price,
        wallet: address,
      });
      setAmount("");
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Order failed.",
      });
    }
  }

  const submitting = status.kind === "submitting";

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
        <span>Price (XLM)</span>
        <span className="font-medium text-brand">{asset.price}</span>
      </div>
      <div className="mt-1 flex justify-between text-sm text-brand-muted">
        <span>Estimated total</span>
        <span className="font-medium text-brand">{formatCurrency(total)}</span>
      </div>

      <button
        type="submit"
        disabled={submitting || isConnecting}
        className="mt-4 w-full rounded-lg bg-brand-accent py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {submitting
          ? "Signing & submitting…"
          : isConnected
            ? `${side === "buy" ? "Buy" : "Sell"} ${asset.code}`
            : isConnecting
              ? "Connecting…"
              : "Connect wallet to trade"}
      </button>

      {status.kind === "success" && (
        <p className="mt-3 text-center text-sm text-green-600 dark:text-green-400">
          Order placed on Stellar.{" "}
          <a
            href={status.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            View transaction
          </a>
        </p>
      )}
      {status.kind === "error" && (
        <p className="mt-3 text-center text-sm text-red-600 dark:text-red-400">
          {status.message}
        </p>
      )}
    </form>
  );
}
