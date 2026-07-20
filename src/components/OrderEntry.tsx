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

  // Sync price when currentPrice changes if we haven't touched it?
  // For simplicity, just use state.

  const handlePercentage = (percent: number) => {
    // Mock user balance is 10000 USD or 1 BTC
    const mockBalance = side === "buy" ? 10000 : 1; 
    const priceVal = orderType === "limit" ? Number(price) : currentPrice;
    
    if (side === "buy") {
      const maxBuySize = mockBalance / priceVal;
      setSize((maxBuySize * percent).toFixed(4));
    } else {
      setSize((mockBalance * percent).toFixed(4));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!size || Number(size) <= 0) return;
    if (orderType === "limit" && (!price || Number(price) <= 0)) return;

    onPlaceOrder({
      id: `ord-${Date.now()}`,
      type: orderType,
      side,
      price: orderType === "limit" ? Number(price) : currentPrice,
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
            onClick={() => setOrderType("limit")}
          >
            Limit
          </button>
          <button
            type="button"
            className={cn(
              "flex-1 text-xs font-medium py-1.5 rounded-md transition-colors",
              orderType === "market" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setOrderType("market")}
          >
            Market
          </button>
        </div>

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
          {orderType === "limit" && (
            <div className="relative">
              <label className="text-xs text-muted-foreground absolute left-3 top-2.5">Price</label>
              <input 
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-14 pr-3 py-2 text-sm text-right focus:outline-none focus:border-primary transition-colors"
                step="0.01"
              />
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
          className={cn(
            "mt-auto w-full py-3 rounded-lg font-semibold text-white transition-opacity hover:opacity-90",
            side === "buy" ? "bg-success" : "bg-danger"
          )}
        >
          {side === "buy" ? "Buy" : "Sell"}
        </button>
      </form>
    </div>
  );
}
