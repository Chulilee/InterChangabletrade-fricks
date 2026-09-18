import Link from "next/link";
import {
  ArrowRight,
  ChartLine,
  Check,
  Globe,
  Layers,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { TradingDashboard } from "@/components/TradingDashboard";
import {
  Drift,
  Float,
  MotionRoot,
  Reveal,
  RevealGroup,
  Spin,
  StaggerItem,
  StaggerItemLi,
} from "@/components/LandingMotion";

const stats = [
  { value: "$2.4B", label: "Volume traded" },
  { value: "36K", label: "Active wallets" },
  { value: "94%", label: "On-chain settlement" },
];

const steps = [
  {
    number: "01",
    icon: Wallet,
    title: "Connect your wallet",
    description:
      "Link any Stellar wallet in seconds. Your keys stay with you — always.",
  },
  {
    number: "02",
    icon: Globe,
    title: "Discover assets",
    description:
      "Browse curated tokenized real-world and digital assets with transparent, on-chain data.",
  },
  {
    number: "03",
    icon: Zap,
    title: "Trade in seconds",
    description:
      "Place orders against a live order book and settle directly on the Stellar network.",
  },
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

const highlights = [
  "Self-custody wallet sign-in",
  "Soroban smart contract settlement",
  "Real-time order book & analytics",
  "No hidden fees",
];

export default function HomePage() {
  return (
    <main>
      <MotionRoot>
      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
      <section
        aria-labelledby="hero-heading"
        className="relative overflow-hidden"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <Drift className="absolute -top-40 left-1/2" y={12} duration={16}>
            <div className="h-[30rem] w-[60rem] -translate-x-1/2 rounded-full bg-sky-200/30 blur-3xl" />
          </Drift>
          <Drift
            className="absolute right-[8%] top-48 h-64 w-64"
            x={-20}
            y={14}
            duration={18}
          >
            <div className="h-full w-full rounded-full bg-indigo-200/25 blur-3xl" />
          </Drift>
        </div>

        <div className="mx-auto max-w-6xl px-6 pb-20 pt-20 sm:pb-24 sm:pt-28">
          <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">
            <RevealGroup>
              <StaggerItem>
              <p className="mb-6 inline-flex items-center gap-3 text-xs font-medium uppercase tracking-[0.28em] text-slate-500">
                <span
                  aria-hidden="true"
                  className="h-px w-8 bg-gradient-to-r from-transparent to-sky-600"
                />
                Powered by Stellar &amp; Soroban
              </p>
              </StaggerItem>

              <StaggerItem>
              <h1
                id="hero-heading"
                className="max-w-xl font-display text-5xl leading-[1.08] tracking-tight text-slate-950 sm:text-6xl lg:text-[4.25rem]"
              >
                Trade the future of{" "}
                <em className="bg-gradient-to-r from-sky-700 to-indigo-700 bg-clip-text font-light italic text-transparent">
                  tokenized assets
                </em>
                .
              </h1>
              </StaggerItem>

              <StaggerItem>
              <p className="mt-7 max-w-lg text-lg leading-8 text-slate-600">
                InterChangableTrade brings together portfolio management,
                market discovery, and secure on-chain transactions in one
                elegant experience — your keys, your assets, your markets.
              </p>
              </StaggerItem>

              <StaggerItem>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/marketplace"
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-7 py-3.5 text-base font-medium text-white transition hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
                >
                  Explore marketplace
                  <ArrowRight
                    aria-hidden="true"
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  />
                </Link>
                <Link
                  href="/portfolio"
                  className="inline-flex items-center justify-center rounded-full px-7 py-3.5 text-base font-medium text-slate-700 ring-1 ring-inset ring-slate-300 transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 hover:ring-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                >
                  View portfolio
                </Link>
              </div>
              </StaggerItem>

              <StaggerItem>
              <dl className="mt-14 grid max-w-lg grid-cols-3 gap-8">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="border-t border-slate-300/70 pt-4"
                  >
                    <dd className="font-display text-3xl font-medium tracking-tight text-slate-950">
                      {stat.value}
                    </dd>
                    <dt className="mt-1 text-[13px] leading-5 text-slate-500">
                      {stat.label}
                    </dt>
                  </div>
                ))}
              </dl>
              </StaggerItem>
            </RevealGroup>

            {/* Portfolio preview card */}
            <Reveal className="relative" delay={0.15}>
              <Float>
              <div
                aria-hidden="true"
                className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-sky-100 via-indigo-50 to-slate-100 blur-2xl"
              />
              <div className="relative rounded-[1.75rem] border border-slate-800/40 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/20 ring-1 ring-white/5">
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
                    Portfolio
                  </p>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                    +12.4%
                  </span>
                </div>

                <p className="mt-5 font-display text-4xl font-medium tracking-tight tabular-nums">
                  $184,260
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Total value across 3 assets
                </p>

                <ul className="mt-6 space-y-3">
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
                      className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.04] px-4 py-3.5 transition hover:border-white/[0.12] hover:bg-white/[0.07]"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[11px] font-semibold text-slate-300"
                        >
                          {asset.symbol.slice(0, 2)}
                        </span>
                        <div>
                          <div className="text-sm font-medium">
                            {asset.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {asset.symbol}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium tabular-nums">
                          {asset.value}
                        </div>
                        <div className="text-xs text-emerald-300/90 tabular-nums">
                          {asset.change}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              </Float>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Live market demo                                                    */}
      {/* ------------------------------------------------------------------ */}
      <TradingDashboard />

      {/* Section ornament */}
      <div aria-hidden="true" className="mx-auto max-w-6xl px-6">
        <div className="flex items-center gap-4">
          <span className="rule-fade h-px flex-1" />
          <Spin duration={22}>
            <Sparkles className="h-4 w-4 text-sky-600/60" />
          </Spin>
          <span className="rule-fade h-px flex-1" />
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* How it works                                                        */}
      {/* ------------------------------------------------------------------ */}
      <section
        aria-labelledby="how-it-works-heading"
        className="mx-auto max-w-6xl px-6 py-20 sm:py-24"
      >
        <Reveal className="max-w-2xl">
          <p className="inline-flex items-center gap-3 text-xs font-medium uppercase tracking-[0.28em] text-sky-700">
            <span aria-hidden="true" className="h-px w-8 bg-sky-600/60" />
            How it works
          </p>
          <h2
            id="how-it-works-heading"
            className="mt-5 font-display text-4xl font-medium tracking-tight text-slate-950 sm:text-5xl"
          >
            From wallet to trade,{" "}
            <em className="font-light italic text-slate-700">in three steps</em>
            .
          </h2>
        </Reveal>

        <RevealGroup
          as="ol"
          className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8"
        >
          {steps.map((step) => {
            const StepIcon = step.icon;
            return (
              <StaggerItemLi
                key={step.title}
                className="group border-t border-slate-300/70 pt-6"
              >
                <div className="flex items-baseline justify-between">
                  <span
                    aria-hidden="true"
                    className="font-display text-sm font-medium tracking-[0.2em] text-sky-700/80"
                  >
                    {step.number}
                  </span>
                  <StepIcon
                    aria-hidden="true"
                    className="h-5 w-5 text-slate-400 transition-colors duration-300 group-hover:text-sky-700"
                  />
                </div>
                <h3 className="mt-4 font-display text-2xl font-medium tracking-tight text-slate-950">
                  {step.title}
                </h3>
                <p className="mt-3 text-[15px] leading-7 text-slate-600">
                  {step.description}
                </p>
              </StaggerItemLi>
            );
          })}
        </RevealGroup>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Why InterChangableTrade                                             */}
      {/* ------------------------------------------------------------------ */}
      <section
        aria-labelledby="why-heading"
        className="border-y border-slate-200/80 bg-white/50"
      >
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="inline-flex items-center justify-center gap-3 text-xs font-medium uppercase tracking-[0.28em] text-sky-700">
              <span aria-hidden="true" className="h-px w-8 bg-sky-600/60" />
              Why InterChangableTrade
              <span aria-hidden="true" className="h-px w-8 bg-sky-600/60" />
            </p>
            <h2
              id="why-heading"
              className="mt-5 font-display text-4xl font-medium tracking-tight text-slate-950 sm:text-5xl"
            >
              A smarter way to access{" "}
              <em className="font-light italic text-slate-700">
                on-chain markets
              </em>
              .
            </h2>
          </Reveal>

          <RevealGroup className="mt-16 grid gap-px overflow-hidden rounded-3xl border border-slate-200 bg-slate-200/70 md:grid-cols-3">
            {features.map((feature) => {
              const FeatureIcon = feature.icon;
              return (
                <StaggerItem key={feature.title}>
                <article className="bg-white/80 p-8 backdrop-blur transition hover:bg-white">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-700">
                    <FeatureIcon aria-hidden="true" className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 font-display text-xl font-medium tracking-tight text-slate-950">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-7 text-slate-600">
                    {feature.description}
                  </p>
                </article>
                </StaggerItem>
              );
            })}
          </RevealGroup>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Closing CTA                                                         */}
      {/* ------------------------------------------------------------------ */}
      <section
        aria-labelledby="cta-heading"
        className="mx-auto max-w-6xl px-6 py-20 sm:py-24"
      >
        <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-16 text-center text-white sm:px-12 sm:py-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            <Drift className="absolute -left-24 -top-24 h-80 w-80" x={30} y={20} duration={16}>
              <div className="h-full w-full rounded-full bg-sky-500/15 blur-3xl" />
            </Drift>
            <Drift className="absolute -bottom-28 -right-20 h-80 w-80" x={-26} y={-18} duration={19}>
              <div className="h-full w-full rounded-full bg-indigo-500/10 blur-3xl" />
            </Drift>
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>

          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-400">
              Begin today
            </p>
            <h2
              id="cta-heading"
              className="mx-auto mt-5 max-w-2xl font-display text-4xl font-medium tracking-tight sm:text-5xl"
            >
              Ready to trade{" "}
              <em className="font-light italic text-slate-300">on-chain</em>?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-slate-400">
              Create an account, connect your Stellar wallet, and place your
              first order in minutes.
            </p>

            <ul className="mx-auto mt-9 flex max-w-2xl flex-wrap items-center justify-center gap-x-7 gap-y-3 text-sm text-slate-400">
              {highlights.map((highlight) => (
                <li key={highlight} className="flex items-center gap-2">
                  <Check
                    aria-hidden="true"
                    className="h-4 w-4 text-sky-400/80"
                  />
                  {highlight}
                </li>
              ))}
            </ul>

            <div className="mt-11 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-medium text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Create free account
                <ArrowRight
                  aria-hidden="true"
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center rounded-full px-7 py-3.5 text-base font-medium text-slate-200 ring-1 ring-inset ring-white/20 transition hover:-translate-y-0.5 hover:bg-white/5 hover:text-white hover:ring-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
              >
                Browse assets first
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
      </MotionRoot>
    </main>
  );
}
