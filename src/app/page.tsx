"use client";

import { useEffect, useState } from "react";
import { useMarketData } from "@/hooks/useMarketData";
import { setupMockServer, type Order } from "@/mocks/server";
import { OrderBook } from "@/components/OrderBook";
import { RecentTrades } from "@/components/RecentTrades";
import { OrderEntry } from "@/components/OrderEntry";
import { UserOrders } from "@/components/UserOrders";
import { Navbar } from "@/components/Navbar";

export default function TradingDashboard() {
  const { bids, asks, trades, connected, sendOrder } = useMarketData();
  const [userOrders, setUserOrders] = useState<Order[]>([]);

  useEffect(() => {
    setupMockServer();
  }, []);

  const currentPrice = asks.length > 0 ? asks[0].price - 0.5 : 40000;

  const handlePlaceOrder = (order: Order) => {
    // Optimistic update
    setUserOrders(prev => [order, ...prev]);
    // Send to WS
    sendOrder(order);
  };

  const handleCancelOrder = (id: string) => {
    setUserOrders(prev => prev.map(o => o.id === id ? { ...o, status: "cancelled" } : o));
    // Usually would send cancel to WS
  };

  // Simulate receiving fill from WS (a real app would get this via useMarketData)
  // For the sake of the mock, let's just pretend any order fills after 2 seconds
  useEffect(() => {
    const openOrders = userOrders.filter(o => o.status === "open");
    openOrders.forEach(o => {
      const timer = setTimeout(() => {
        setUserOrders(prev => prev.map(order => 
          order.id === o.id && order.status === "open" ? { ...order, status: "filled" } : order
        ));
      }, 2000);
      return () => clearTimeout(timer);
    });
  }, [userOrders]);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <Navbar />
      
      {/* Top Bar Status */}
      <div className="px-4 py-2 border-b border-border bg-card flex justify-between items-center text-sm">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-lg tracking-tight">BTC/USD</h1>
          <span className="text-success font-medium">{currentPrice.toFixed(2)}</span>
          <span className="text-muted-foreground">+2.4%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-success' : 'bg-danger'}`}></div>
          <span className="text-muted-foreground text-xs">{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Main Grid Layout */}
      <main className="flex-1 p-2 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-2 overflow-hidden">
        
        {/* Left Column: Order Book */}
        <div className="md:col-span-2 lg:col-span-3 h-full overflow-hidden">
          <OrderBook bids={bids} asks={asks} />
        </div>

        {/* Center/Main Column: Chart (Placeholder) & User Orders */}
        <div className="md:col-span-2 lg:col-span-6 flex flex-col gap-2 h-full overflow-hidden">
          <div className="flex-1 bg-card rounded-xl border border-border flex items-center justify-center text-muted-foreground">
            {/* Real app would have a TradingView chart here */}
            Chart Area (Placeholder)
          </div>
          <div className="h-1/3 min-h-[250px] overflow-hidden">
            <UserOrders orders={userOrders} onCancelOrder={handleCancelOrder} />
          </div>
        </div>

        {/* Right Column: Order Entry & Recent Trades */}
        <div className="md:col-span-4 lg:col-span-3 flex flex-col gap-2 h-full overflow-hidden">
          <div className="h-1/2 overflow-hidden">
            <OrderEntry currentPrice={currentPrice} onPlaceOrder={handlePlaceOrder} />
          </div>
          <div className="h-1/2 overflow-hidden">
            <RecentTrades trades={trades} />
          </div>
        </div>

      </main>
    </div>
  );
}
