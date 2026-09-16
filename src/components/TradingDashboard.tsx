"use client";

import { useState } from "react";
import { OrderBook } from "@/components/OrderBook";
import { OrderEntry } from "@/components/OrderEntry";
import { UserOrders } from "@/components/UserOrders";
import type { Order, OrderBookEntry } from "@/mocks/server";

const bids: OrderBookEntry[] = [
  { price: 39990, size: 1.2, total: 1.2 },
  { price: 39980, size: 0.8, total: 2 },
  { price: 39970, size: 1.5, total: 3.5 },
];

const asks: OrderBookEntry[] = [
  { price: 40010, size: 0.9, total: 0.9 },
  { price: 40020, size: 1.1, total: 2 },
  { price: 40030, size: 0.7, total: 2.7 },
];

export function TradingDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);

  function handlePlaceOrder(order: Order) {
    setOrders((currentOrders) => [...currentOrders, order]);
  }

  function handleCancelOrder(orderId: string) {
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId ? { ...order, status: "cancelled" } : order,
      ),
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">
          Live market
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">BTC/USD</h1>
        <p className="mt-2 text-brand-muted">
          Trade with a live order book and manage your open orders.
        </p>
      </div>

      <div className="grid min-h-[32rem] gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <OrderBook bids={bids} asks={asks} />
        <OrderEntry currentPrice={40000} onPlaceOrder={handlePlaceOrder} />
      </div>

      <div className="mt-6 min-h-48">
        <UserOrders orders={orders} onCancelOrder={handleCancelOrder} />
      </div>
    </section>
  );
}