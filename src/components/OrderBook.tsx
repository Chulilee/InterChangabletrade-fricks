import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { OrderBookEntry } from "@/mocks/server";

export function OrderBook({ bids, asks }: { bids: OrderBookEntry[], asks: OrderBookEntry[] }) {
  // Find max total to calculate depth percentage
  const maxTotal = Math.max(
    bids.length > 0 ? bids[bids.length - 1].total : 0,
    asks.length > 0 ? asks[asks.length - 1].total : 0
  );

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/20">
        <h3 className="font-semibold text-sm tracking-wide text-foreground">Order Book</h3>
      </div>
      
      <div className="flex-1 flex flex-col p-2 gap-1 overflow-hidden text-xs font-mono">
        {/* Asks (Sell Orders - Red) */}
        <div className="flex-1 flex flex-col-reverse overflow-hidden justify-end">
          {asks.slice().reverse().map((ask) => (
            <OrderRow 
              key={`ask-${ask.price}`} 
              type="ask" 
              price={ask.price} 
              size={ask.size} 
              total={ask.total} 
              maxTotal={maxTotal} 
            />
          ))}
        </div>
        
        {/* Spread / Mid Market Price */}
        <div className="py-2 flex items-center justify-center border-y border-border/50 bg-muted/10 my-1">
          <span className="text-lg font-bold text-success">
            {asks[0] ? (asks[0].price - 0.5).toFixed(1) : "---"}
          </span>
        </div>

        {/* Bids (Buy Orders - Green) */}
        <div className="flex-1 overflow-hidden">
          {bids.map((bid) => (
            <OrderRow 
              key={`bid-${bid.price}`} 
              type="bid" 
              price={bid.price} 
              size={bid.size} 
              total={bid.total} 
              maxTotal={maxTotal} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function OrderRow({ type, price, size, total, maxTotal }: { type: 'bid'|'ask', price: number, size: number, total: number, maxTotal: number }) {
  const depthPercentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  
  // Highlight flash effect state
  const [flash, setFlash] = useState(false);
  
  useEffect(() => {
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 300);
    return () => clearTimeout(t);
  }, [size]);

  return (
    <div className="relative flex justify-between items-center px-2 py-1 hover:bg-muted/50 cursor-pointer group">
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
