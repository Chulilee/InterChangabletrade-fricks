import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { TradeEntry } from "@/mocks/server";
import { ArrowDown, ArrowUp } from "lucide-react";

export function RecentTrades({ trades }: { trades: TradeEntry[] }) {
  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/20">
        <h3 className="font-semibold text-sm tracking-wide text-foreground">Recent Trades</h3>
      </div>
      
      <div className="flex-1 flex flex-col p-2 gap-1 overflow-y-auto text-xs font-mono">
        <div className="flex justify-between px-2 text-muted-foreground mb-2">
          <span>Price</span>
          <span>Size</span>
          <span>Time</span>
        </div>
        
        {trades.map((trade) => (
          <TradeRow key={trade.id} trade={trade} />
        ))}
      </div>
    </div>
  );
}

function TradeRow({ trade }: { trade: TradeEntry }) {
  const [flash, setFlash] = useState(true);
  
  useEffect(() => {
    const t = setTimeout(() => setFlash(false), 500);
    return () => clearTimeout(t);
  }, [trade.id]);

  const timeStr = new Date(trade.time).toLocaleTimeString(undefined, { 
    hour12: false, 
    hour: "2-digit", 
    minute: "2-digit", 
    second: "2-digit" 
  });

  const isBuy = trade.side === "buy";

  return (
    <div className={cn(
      "flex justify-between items-center px-2 py-1 rounded transition-colors duration-500 hover:bg-muted/50",
      flash ? (isBuy ? "bg-success/20" : "bg-danger/20") : "bg-transparent"
    )}>
      <div className={cn("flex items-center gap-1", isBuy ? "text-success" : "text-danger")}>
        {isBuy ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
        <span>{trade.price.toFixed(2)}</span>
      </div>
      <span className="text-foreground">{trade.size.toFixed(4)}</span>
      <span className="text-muted-foreground opacity-70">{timeStr}</span>
    </div>
  );
}
