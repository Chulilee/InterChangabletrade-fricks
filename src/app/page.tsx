import Link from "next/link";
import { ArrowRight, ChartLine, Layers, ShieldCheck, Sparkles } from "lucide-react";
import { TradingDashboard } from "@/components/TradingDashboard";

const stats = [
  { value: "$2.4B", label: "Volume traded" },
  { value: "36K", label: "Active wallets" },
  { value: "94%", label: "On-chain transparency" },
];

const features = [
  {
    icon: Layers,
    title: "Curated marketplace",
    description:
      "Tokenized real-world and digital assets surfaced in one intuitive trading experience.",
  },
  {
    icon: ChartLine,
    title: "Portfolio insights",
    description:
      "Track holdings, monitor performance, and discover opportunities in real time.",
  },
  {
    icon: ShieldCheck,
    title: "Secure on-chain access",
    description:
      "Built for Stellar-native workflows with wallet support and transparent asset data.",
  },
];

export default function HomePage() {
  return (
    <main>
      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
      <section
        aria-labelledby="hero-heading"
        className="relative overflow-hidden"
      >
        {/* Decorative background glows — hidden from assistive tech */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute -top-32 left-1/2 h-[28rem] w-[52rem] -translate-x-1/2 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="absolute right-0 top-40 h-72 w-72 rounded-full bg-indigo-400/15 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl px-6 pb-16 pt-16 sm:pb-20 sm:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="animate-fade-up">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-accent/30 bg-brand-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
                <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                Powered by Stellar &amp; Soroban
              </p>
              <h1
                id="hero-heading"
                className="max-w-xl text-4xl font-black leading-[1.05] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl"
              >
                Trade the future of{" "}
                <span className="bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent">
                  tokenized assets
                </span>
                .
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                InterChangableTrade brings together portfolio management,
                market discovery, and secure on-chain transactions in one
                elegant experience — your keys, your assets, your markets.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/marketplace"
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-sky-600/25 transition hover:-translate-y-0.5 hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                >
                  Explore marketplace
                  <ArrowRight
                    aria-hidden="true"
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
                <Link
                  href="/portfolio"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white/80 px-6 py-3.5 text-base font-semibold text-slate-700 backdrop-blur transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                >
                  View portfolio
                </Link>
              </div>

              <dl className="mt-10 grid gap-5 sm:grid-cols-3">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur"
                  >
                    <dt className="order-2 mt-1 text-sm text-slate-500">
                      {stat.label}
                    </dt>
                    <dd className="order-1 text-2xl font-bold text-slate-950">
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Portfolio preview card */}
            <div className="relative animate-fade-up [animation-delay:120ms]">
              <div
                aria-hidden="true"
                className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-sky-200 via-indigo-100 to-slate-200 blur-3xl"
              />
              <div className="relative rounded-[2rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-2xl shadow-slate-400/20">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Portfolio
                    </p>
                    <p className="mt-2 text-2xl font-bold tabular-nums">
                      $184,260
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                    +12.4%
                  </span>
                </div>

                <ul className="mt-6 space-y-4">
                  {[
                    {
                      symbol: "XLM",
                      name: "Stellar",
                      value: "$42,300",
                      change: "+4.8%",
                    },
                    {
                      symbol: "RWA",
                      name: "Real Estate",
                      value: "$58,940",
                      change: "+7.1%",
                    },
                    {
                      symbol: "NFT",
                      name: "Digital Collectibles",
                      value: "$33,520",
                      change: "+2.3%",
                    },
                  ].map((asset) => (
                    <li
                      key={asset.symbol}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div>
                        <div className="font-semibold">{asset.symbol}</div>
                        <div className="text-sm text-slate-400">
                          {asset.name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold tabular-nums">
                          {asset.value}
                        </div>
                        <div className="text-sm text-emerald-300 tabular-nums">
                          {asset.change}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Live market demo                                                    */}
      {/* ------------------------------------------------------------------ */}
      <TradingDashboard />

      {/* ------------------------------------------------------------------ */}
      {/* Why InterChangableTrade                                             */}
      {/* ------------------------------------------------------------------ */}
      <section
        aria-labelledby="why-heading"
        className="border-t border-slate-200 bg-slate-50/60"
      >
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">
              Why InterChangableTrade
            </p>
            <h2
              id="why-heading"
              className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"
            >
              Discover a smarter way to access on-chain markets.
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {features.map((feature) => {
              const FeatureIcon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <FeatureIcon aria-hidden="true" className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-base leading-7 text-slate-600">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
