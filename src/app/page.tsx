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

const stats = [
  { value: "$2.4B", label: "Volume traded" },
  { value: "36K", label: "Active wallets" },
  { value: "94%", label: "On-chain transparency" },
];

const features = [
  {
    title: "Curated marketplace",
    description:
      "Tokenized real-world and digital assets surfaced in one intuitive trading experience.",
  },
  {
    title: "Portfolio insights",
    description:
      "Track holdings, monitor performance, and discover opportunities in real time.",
  },
  {
    title: "Secure on-chain access",
    description:
      "Built for Stellar-native workflows with wallet support and transparent asset data.",
  },
];

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="mb-5 inline-flex items-center rounded-full border border-brand-accent/30 bg-brand-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
              Powered by Stellar &amp; Soroban
            </p>
            <h1 className="max-w-xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Trade the future of tokenized assets.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              InterChangableTrade brings together portfolio management, market
              discovery, and secure on-chain transactions in one elegant
              experience.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-sky-600/20 transition hover:-translate-y-0.5 hover:bg-sky-500"
              >
                Explore marketplace
              </Link>
              <Link
                href="/portfolio"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                View portfolio
              </Link>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
                  <div className="text-2xl font-bold text-slate-950">{stat.value}</div>
                  <div className="mt-1 text-sm text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-sky-200 via-indigo-100 to-slate-200 blur-3xl" />
            <div className="relative rounded-[2rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-2xl shadow-slate-400/20">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Portfolio
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">$184,260</h2>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                  +12.4%
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {[
                  { symbol: "XLM", name: "Stellar", value: "$42,300", change: "+4.8%" },
                  { symbol: "RWA", name: "Real Estate", value: "$58,940", change: "+7.1%" },
                  { symbol: "NFT", name: "Digital Collectibles", value: "$33,520", change: "+2.3%" },
                ].map((asset) => (
                  <div key={asset.symbol} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div>
                      <div className="font-semibold">{asset.symbol}</div>
                      <div className="text-sm text-slate-400">{asset.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{asset.value}</div>
                      <div className="text-sm text-emerald-300">{asset.change}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50/60">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">
              Why InterChangableTrade
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Discover a smarter way to access on-chain markets.
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-lg text-sky-700">
                  ✦
                </div>
                <h3 className="text-xl font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-3 text-base leading-7 text-slate-600">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
