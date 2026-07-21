import { useEffect, useState, useCallback, useRef } from "react";
import type { OrderBookEntry, TradeEntry } from "../mocks/server";

export function useMarketData() {
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const [trades, setTrades] = useState<TradeEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Dynamically check if mock-socket server is ready (in dev) or connect to real WS
    const ws = new WebSocket("ws://localhost:8080");
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "snapshot") {
        setBids(msg.payload.bids);
        setAsks(msg.payload.asks);
        setTrades(msg.payload.trades);
      } else if (msg.type === "trade") {
        setTrades((prev) => [msg.payload, ...prev].slice(0, 50));
      } else if (msg.type === "book_update") {
        const { side, update } = msg.payload;
        const setFn = side === "bids" ? setBids : setAsks;
        
        setFn((prev) => {
          const updated = [...prev];
          const idx = updated.findIndex((lvl) => lvl.price === update.price);
          
          if (update.size === 0) {
            if (idx !== -1) updated.splice(idx, 1);
          } else {
            if (idx !== -1) {
              updated[idx] = { ...updated[idx], size: update.size };
            } else {
              updated.push(update);
              updated.sort((a, b) => side === "bids" ? b.price - a.price : a.price - b.price);
            }
          }
          
          // Recalculate totals
          let total = 0;
          return updated.map(lvl => {
            total += lvl.size;
            return { ...lvl, total };
          }).slice(0, 20); // Keep top 20 levels
        });
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const sendOrder = useCallback((order: import("../mocks/server").Order) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "place_order", payload: order }));
    }
  }, []);

  return { bids, asks, trades, connected, sendOrder };
}
