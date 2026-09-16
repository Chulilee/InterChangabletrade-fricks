import Link from "next/link";
import { TradingDashboard } from "@/components/TradingDashboard";

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

  useEffect(() => {
    return setupMockServer();
  }, []);

  const currentPrice = asks.length > 0 ? asks[0].price - 0.5 : 40000;

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
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur"
                >
                  <div className="text-2xl font-bold text-slate-950">{stat.value}</div>
                  <div className="mt-1 text-sm text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

  // Simulate receiving fill from WS (a real app would get this via useMarketData)
  // For the sake of the mock, let's just pretend any order fills after 2 seconds
  useEffect(() => {
    const openOrders = userOrders.filter(o => o.status === "open");
    const timers = openOrders.map(o => setTimeout(() => {
        setUserOrders(prev => prev.map(order => 
          order.id === o.id && order.status === "open" ? { ...order, status: "filled" } : order
        ));
      }, 2000));

    return () => timers.forEach(timer => clearTimeout(timer));
  }, [userOrders]);

              <div className="mt-6 space-y-4">
                {[
                  { symbol: "XLM", name: "Stellar", value: "$42,300", change: "+4.8%" },
                  { symbol: "RWA", name: "Real Estate", value: "$58,940", change: "+7.1%" },
                  { symbol: "NFT", name: "Digital Collectibles", value: "$33,520", change: "+2.3%" },
                ].map((asset) => (
                  <div
                    key={asset.symbol}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
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

      <TradingDashboard />

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
              <article
                key={feature.title}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-lg text-sky-700">
                  ✦
                </div>
                <h3 className="text-xl font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
