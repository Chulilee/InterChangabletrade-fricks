import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { OrderBookEntry } from "@/mocks/server";

export function OrderBook({ bids, asks }: { bids: OrderBookEntry[], asks: OrderBookEntry[] }) {
  // Find max total to calculate depth percentage
  const maxTotal = Math.max(
    bids.length > 0 ? bids[bids.length - 1].total : 0,
    asks.length > 0 ? asks[asks.length - 1].total : 0
  );

  const bestAsk = asks.length > 0 ? asks[0] : null;
  const bestBid = bids.length > 0 ? bids[0] : null;

  const hasSpread = bestAsk !== null && bestBid !== null;
  const spread = hasSpread ? Math.max(0, bestAsk.price - bestBid.price) : 0;
  const midPrice = hasSpread
    ? (bestAsk.price + bestBid.price) / 2
    : bestAsk
    ? bestAsk.price
    : bestBid
    ? bestBid.price
    : null;
  const spreadPercent = hasSpread && midPrice && midPrice > 0 ? (spread / midPrice) * 100 : 0;
  const isTightSpread = spreadPercent < 0.5;

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border overflow-hidden" data-testid="order-book" role="region" aria-label="Order book">
      <div className="px-4 py-3 border-b border-border bg-muted/20">
        <h2 className="font-semibold text-sm tracking-wide text-foreground" data-testid="order-book-title">Order Book</h2>
      </div>
       
      <div className="flex-1 flex flex-col p-2 gap-1 overflow-hidden text-xs font-mono">
        {/* Asks (Sell Orders - Red) */}
        <div className="flex-1 flex flex-col-reverse overflow-hidden justify-end" data-testid="order-book-asks" role="list" aria-label="Sell orders (asks), lowest price first">
          {asks.slice().reverse().map((ask) => {
            const isBest = ask.price === bestAsk?.price;
            return (
              <OrderRow
                key={`ask-${ask.price}`}
                type="ask"
                price={ask.price}
                size={ask.size}
                total={ask.total}
                maxTotal={maxTotal}
                isBest={isBest}
              />
            );
          })}
        </div>
        
        {/* Spread / Mid Market Price */}
        <div 
          className={cn(
            "py-2 px-3 flex items-center justify-between border-y border-border/50 bg-muted/10 my-1 transition-all duration-300",
            hasSpread && (isTightSpread ? "border-success/30 bg-success/5" : "border-amber-500/30 bg-amber-500/5")
          )} 
          data-testid="order-book-mid" 
          role="status" 
          aria-live="polite" 
          aria-label="Mid market price and spread"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase font-sans font-medium">Mid</span>
            <span className={cn(
              "text-sm font-bold font-mono transition-colors",
              isTightSpread ? "text-success" : "text-amber-500"
            )}>
              {midPrice !== null ? midPrice.toFixed(2) : "---"}
            </span>
          </div>

          {hasSpread && (
            <div 
              className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold transition-all duration-300",
                isTightSpread ? "text-success bg-success/15" : "text-amber-500 bg-amber-500/15"
              )}
              data-testid="order-book-spread"
              title={`Spread: ${spread.toFixed(2)} (${spreadPercent.toFixed(2)}%)`}
            >
              <span className="text-[10px] uppercase font-sans opacity-70">Spread</span>
              <span>{spread.toFixed(2)}</span>
              <span className="opacity-80">({spreadPercent.toFixed(2)}%)</span>
            </div>
          )}
        </div>

        {/* Bids (Buy Orders - Green) */}
        <div className="flex-1 overflow-hidden" data-testid="order-book-bids" role="list" aria-label="Buy orders (bids), highest price first">
          {bids.map((bid) => {
            const isBest = bid.price === bestBid?.price;
            return (
              <OrderRow
                key={`bid-${bid.price}`}
                type="bid"
                price={bid.price}
                size={bid.size}
                total={bid.total}
                maxTotal={maxTotal}
                isBest={isBest}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OrderRow({ 
  type, 
  price, 
  size, 
  total, 
  maxTotal,
  isBest = false
}: { 
  type: 'bid'|'ask', 
  price: number, 
  size: number, 
  total: number, 
  maxTotal: number,
  isBest?: boolean
}) {
  const depthPercentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  
  // Highlight flash effect state
  const [flash, setFlash] = useState(false);
  
  useEffect(() => {
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 300);
    return () => clearTimeout(t);
  }, [size]);

  return (
    <div
      role="listitem"
      aria-label={`${isBest ? "Best " : ""}${type === "ask" ? "Ask" : "Bid"} ${size.toFixed(4)} at ${price.toFixed(2)}, total depth ${total.toFixed(4)}`}
      className={cn(
        "relative flex justify-between items-center px-2 py-1 hover:bg-muted/50 cursor-pointer group transition-colors duration-200",
        isBest && (type === "bid" ? "bg-success/5 font-semibold" : "bg-danger/5 font-semibold")
      )}
      data-testid={`book-row-${type}-${price.toFixed(2)}`}
      data-is-best={isBest ? "true" : undefined}
    >
      {/* Depth Background */}
      <div 
        className={cn(
          "absolute right-0 top-0 bottom-0 opacity-15 transition-all duration-300",
          type === "bid" ? "bg-success" : "bg-danger"
        )}
        style={{ width: `${depthPercentage}%` }}
      />
      
      {/* Flash overlay */}
      <div 
        className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none",
          flash ? "opacity-30" : "",
          type === "bid" ? "bg-success" : "bg-danger"
        )}
      />

      <span className={cn(
        "relative z-10 font-medium",
        type === "bid" ? "text-success" : "text-danger"
      )}>
        {price.toFixed(2)}
      </span>
      <span className="relative z-10 text-muted-foreground group-hover:text-foreground transition-colors">
        {size.toFixed(4)}
      </span>
      <span className="relative z-10 text-muted-foreground opacity-50">
        {total.toFixed(4)}
      </span>
    </div>
  );
}
