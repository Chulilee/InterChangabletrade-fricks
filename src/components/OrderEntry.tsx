"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function OrderEntry({ 
  currentPrice, 
  onPlaceOrder 
}: { 
  currentPrice: number, 
  onPlaceOrder: (order: import("@/mocks/server").Order) => void 
}) {
  const [orderType, setOrderType] = useState<"limit" | "market">("limit");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [price, setPrice] = useState<string>(currentPrice.toString());
  const [size, setSize] = useState<string>("");

  // A market order never carries a user-supplied price: it always trades at
  // whatever the market is printing right now. Deriving the price the order
  // will actually use means the submit path, the percentage shortcuts and the
  // UI can never disagree about which price is in play.
  const effectivePrice = orderType === "market" ? currentPrice : Number(price);

  // A market order trades at whatever the market is printing, so there is no
  // price field to fall back on: if the feed has nothing usable there is
  // nothing to submit. Limit orders are validated the same way, off the price
  // they would actually trade at.
  const hasPrice = Number.isFinite(effectivePrice) && effectivePrice > 0;
  const hasSize = size !== "" && Number.isFinite(Number(size)) && Number(size) > 0;

  // Switching to market discards whatever price was typed into the field. A
  // market order can only ever trade at the market price, so keeping a stale
  // custom value in state was misleading: the field was hidden while still
  // holding it, and the value reappeared as a surprise limit price the moment
  // the user toggled back to limit.
  const handleOrderTypeChange = (nextType: "limit" | "market") => {
    setOrderType(nextType);
    if (nextType === "market") {
      setPrice(currentPrice.toString());
    }
  };

  // Sync price when currentPrice changes if we haven't touched it?
  // For simplicity, just use state.

  const handlePercentage = (percent: number) => {
    if (!hasPrice) return;

    // Mock user balance is 10000 USD or 1 BTC
    const mockBalance = side === "buy" ? 10000 : 1;

    if (side === "buy") {
      const maxBuySize = mockBalance / effectivePrice;
      setSize((maxBuySize * percent).toFixed(4));
    } else {
      setSize((mockBalance * percent).toFixed(4));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSize) return;
    if (!hasPrice) return;

    onPlaceOrder({
      id: `ord-${Date.now()}`,
      type: orderType,
      side,
      price: effectivePrice,
      size: Number(size),
      status: "open"
    });
    
    setSize("");
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/20">
        <h3 className="font-semibold text-sm tracking-wide text-foreground">Order Entry</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4 flex-1">
        {/* Order Type Tabs */}
        <div className="flex bg-muted/30 rounded-lg p-1">
          <button
            type="button"
            className={cn(
              "flex-1 text-xs font-medium py-1.5 rounded-md transition-colors",
              orderType === "limit" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => handleOrderTypeChange("limit")}
          >
            Limit
          </button>
          <button
            type="button"
            className={cn(
              "flex-1 text-xs font-medium py-1.5 rounded-md transition-colors",
              orderType === "market" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => handleOrderTypeChange("market")}
          >
            Market
          </button>
        </div>

        {orderType === "market" && (
          <p
            data-testid="market-order-hint"
            className="-mt-2 text-xs leading-relaxed text-muted-foreground"
          >
            Market orders fill against the current market price rather than a
            price you set, and that price can move while the order fills.
          </p>
        )}

        {/* Side Tabs */}
        <div className="flex gap-2">
          <button
            type="button"
            className={cn(
              "flex-1 py-2 rounded-lg font-semibold text-sm transition-colors border",
              side === "buy" 
                ? "bg-success/10 text-success border-success/30" 
                : "bg-muted/10 text-muted-foreground border-transparent hover:bg-muted/30"
            )}
            onClick={() => setSide("buy")}
          >
            Buy
          </button>
          <button
            type="button"
            className={cn(
              "flex-1 py-2 rounded-lg font-semibold text-sm transition-colors border",
              side === "sell" 
                ? "bg-danger/10 text-danger border-danger/30" 
                : "bg-muted/10 text-muted-foreground border-transparent hover:bg-muted/30"
            )}
            onClick={() => setSide("sell")}
          >
            Sell
          </button>
        </div>

        {/* Inputs */}
        <div className="flex flex-col gap-3">
          {orderType === "limit" ? (
            <div className="relative">
              <label
                htmlFor="order-entry-price"
                className="text-xs text-muted-foreground absolute left-3 top-2.5"
              >Price</label>
              <input 
                id="order-entry-price"
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-14 pr-3 py-2 text-sm text-right focus:outline-none focus:border-primary transition-colors"
                step="0.01"
              />
            </div>
          ) : (
            // A market order takes no price input, but the price it will trade
            // at still belongs on screen: hiding the field entirely is what
            // made it look like the order had no price at all.
            <div className="relative">
              <span className="text-xs text-muted-foreground absolute left-3 top-2.5">
                Market price
              </span>
              <div
                data-testid="market-price"
                className="w-full bg-muted/20 border border-dashed border-border rounded-lg pl-14 pr-3 py-2 text-sm text-right text-muted-foreground"
              >
                {hasPrice ? effectivePrice.toFixed(2) : "Unavailable"}
              </div>
            </div>
          )}
          
          <div className="relative">
            <label className="text-xs text-muted-foreground absolute left-3 top-2.5">Size</label>
            <input 
              type="number"
              value={size}
              onChange={e => setSize(e.target.value)}
              className="w-full bg-background border border-border rounded-lg pl-14 pr-3 py-2 text-sm text-right focus:outline-none focus:border-primary transition-colors"
              step="0.0001"
            />
          </div>
        </div>

        {/* Percentage Buttons */}
        <div className="flex justify-between gap-2">
          {[0.25, 0.5, 0.75, 1].map(pct => (
            <button
              key={pct}
              type="button"
              onClick={() => handlePercentage(pct)}
              className="flex-1 py-1 bg-muted/20 hover:bg-muted/40 rounded text-xs text-muted-foreground transition-colors"
            >
              {pct * 100}%
            </button>
          ))}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!hasSize || !hasPrice}
          className={cn(
            "mt-auto w-full py-3 rounded-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:hover:opacity-40",
            side === "buy" ? "bg-success" : "bg-danger"
          )}
        >
          {side === "buy" ? "Buy" : "Sell"}
        </button>
      </form>
    </div>
  );
}
