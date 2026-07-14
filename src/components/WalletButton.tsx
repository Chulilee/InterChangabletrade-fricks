"use client";

import { useWallet } from "@/hooks/useWallet";

function truncate(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletButton() {
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet();

  if (isConnected && address) {
    return (
      <button
        onClick={disconnect}
        className="rounded-lg border border-brand-accent/40 px-4 py-2 text-sm font-medium text-brand-accent transition hover:bg-brand-accent/10"
        title="Click to disconnect"
      >
        {truncate(address)}
      </button>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={isConnecting}
      className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
    >
      {isConnecting ? "Connecting…" : "Connect wallet"}
    </button>
  );
}
