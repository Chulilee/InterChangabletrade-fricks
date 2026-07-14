import Link from "next/link";

export default function HomePage() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20 text-center">
      <p className="mb-3 text-sm font-medium uppercase tracking-wider text-brand-accent">
        Powered by Stellar &amp; Soroban
      </p>
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Discover, trade and manage tokenized assets
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-brand-muted">
        InterChangableTrade is the user-facing gateway to a decentralized
        marketplace for real-world and digital assets on the Stellar network.
      </p>
      <div className="mt-10 flex items-center justify-center gap-4">
        <Link
          href="/marketplace"
          className="rounded-lg bg-brand-accent px-6 py-3 font-medium text-white transition hover:opacity-90"
        >
          Explore marketplace
        </Link>
        <Link
          href="/portfolio"
          className="rounded-lg border border-brand-muted/30 px-6 py-3 font-medium transition hover:bg-brand-muted/10"
        >
          View portfolio
        </Link>
      </div>
    </section>
  );
}
