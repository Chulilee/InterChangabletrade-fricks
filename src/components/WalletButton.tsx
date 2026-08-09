"use client";

import { useWallet } from "@/hooks/useWallet";
import { accountExplorerUrl } from "@/lib/stellar/config";

function truncate(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletButton() {
  const {
    address,
    isConnected,
    isConnecting,
    xlmBalance,
    connect,
    disconnect,
    fund,
  } = useWallet();

  if (isConnected && address) {
    const unfunded = xlmBalance === "0" || xlmBalance === null;
    return (
      <div className="flex items-center gap-2">
        {unfunded ? (
          <button
            onClick={() => void fund()}
            className="rounded-lg border border-brand-accent/40 px-3 py-2 text-xs font-medium text-brand-accent transition hover:bg-brand-accent/10"
            title="Fund this account with Testnet XLM via Friendbot"
          >
            Fund (Testnet)
          </button>
        ) : (
          <a
            href={accountExplorerUrl(address)}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden text-xs text-brand-muted hover:text-brand sm:inline"
            title="View account on stellar.expert"
          >
            {Number(xlmBalance).toFixed(2)} XLM
          </a>
        )}
        <button
          onClick={() => void disconnect()}
          className="rounded-lg border border-brand-accent/40 px-4 py-2 text-sm font-medium text-brand-accent transition hover:bg-brand-accent/10"
          title="Click to disconnect"
        >
          {truncate(address)}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => void connect()}
      disabled={isConnecting}
      className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
    >
      {isConnecting ? "Connecting…" : "Connect wallet"}
    </button>
  );
}
