import { Server, WebSocket } from "mock-socket";

export type OrderBookEntry = { price: number; size: number; total: number };
export type TradeEntry = { id: string; price: number; size: number; side: "buy" | "sell"; time: number };
export type Order = { id: string; side: "buy" | "sell"; price: number; size: number; status: "open" | "filled" | "cancelled"; type?: "limit" | "market" };

export function setupMockServer() {
  if (typeof window === "undefined") return; // Only run on client side

  // Avoid creating multiple servers during fast refresh
  const globalWindow = window as unknown as { __mockServer?: Server };
  if (globalWindow.__mockServer) {
    globalWindow.__mockServer.close();
  }

  const mockServer = new Server("ws://localhost:8080");
  globalWindow.__mockServer = mockServer;

  mockServer.on("connection", (socket) => {
    console.log("Mock WebSocket connected");

    // Send initial snapshot
    const generateSnapshot = () => {
      const bids: OrderBookEntry[] = [];
      const asks: OrderBookEntry[] = [];
      let bidTotal = 0;
      let askTotal = 0;

      for (let i = 0; i < 15; i++) {
        const bidSize = Math.random() * 2 + 0.1;
        bidTotal += bidSize;
        bids.push({ price: 40000 - i * 10, size: bidSize, total: bidTotal });

        const askSize = Math.random() * 2 + 0.1;
        askTotal += askSize;
        asks.push({ price: 40010 + i * 10, size: askSize, total: askTotal });
      }

      const trades: TradeEntry[] = Array.from({ length: 20 }, (_, i) => ({
        id: `trade-${i}`,
        price: 40000 + (Math.random() * 20 - 10),
        size: Math.random() * 1.5 + 0.01,
        side: Math.random() > 0.5 ? "buy" : "sell",
        time: Date.now() - i * 1000,
      }));

      return { type: "snapshot", payload: { bids, asks, trades } };
    };

    socket.send(JSON.stringify(generateSnapshot()));

    // Simulate live updates
    const interval = setInterval(() => {
      const updateType = Math.random();
      
      if (updateType > 0.7) {
        // Trade update
        const trade: TradeEntry = {
          id: `trade-${Date.now()}`,
          price: 40000 + (Math.random() * 50 - 25),
          size: Math.random() * 0.5 + 0.05,
          side: Math.random() > 0.5 ? "buy" : "sell",
          time: Date.now(),
        };
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "trade", payload: trade }));
        }
      } else {
        // Order book update
        const side = Math.random() > 0.5 ? "bids" : "asks";
        const basePrice = side === "bids" ? 40000 : 40010;
        const offset = Math.floor(Math.random() * 15) * 10;
        
        const update = {
          price: basePrice + (side === "asks" ? offset : -offset),
          size: Math.random() > 0.8 ? 0 : Math.random() * 2 + 0.1, // 20% chance to remove level
        };
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "book_update", payload: { side, update } }));
        }
      }
    }, 300); // Fast updates to show off the UI

    socket.on("message", (data) => {
      try {
        const msg = JSON.parse(data as string);
        if (msg.type === "place_order") {
          // Simulate order matching
          setTimeout(() => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ 
                type: "order_filled", 
                payload: { id: msg.payload.id } 
              }));
            }
          }, 2000);
        }
      } catch {
        // ignore
      }
    });

    socket.on("close", () => {
      clearInterval(interval);
    });
  });
}
