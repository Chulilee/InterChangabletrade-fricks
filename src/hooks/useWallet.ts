"use client";

import { useCallback, useEffect, useState } from "react";
import type { WalletContextValue, WalletState } from "@/types/wallet";
import {
  connectWallet,
  disconnectWallet,
  getConnectedAddress,
} from "@/lib/stellar/wallet";
import {
  accountExists,
  fundWithFriendbot,
  getNativeBalance,
} from "@/lib/stellar/horizon";

const STORAGE_KEY = "ict.wallet.address";

/**
 * Wallet hook backed by Stellar Wallets Kit. `connect()` opens the real
 * Freighter / xBull / Albedo modal and returns an on-chain account; balances are
 * read from Horizon on the configured network (Testnet by default).
 */
export function useWallet(): WalletContextValue {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    xlmBalance: null,
    error: null,
  });

  const loadBalance = useCallback(async (address: string) => {
    try {
      const funded = await accountExists(address);
      const xlmBalance = funded ? await getNativeBalance(address) : "0";
      setState((prev) =>
        prev.address === address ? { ...prev, xlmBalance } : prev,
      );
    } catch {
      /* balance is best-effort; leave prior value */
    }
  }, []);

  // Restore a previously connected session on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const active = (await getConnectedAddress()) ?? stored;
      if (cancelled) return;
      setState((prev) => ({
        ...prev,
        address: active,
        isConnected: true,
      }));
      void loadBalance(active);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadBalance]);

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));
    try {
      const address = await connectWallet();
      window.localStorage.setItem(STORAGE_KEY, address);
      setState((prev) => ({
        ...prev,
        address,
        isConnected: true,
        isConnecting: false,
      }));
      void loadBalance(address);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: err instanceof Error ? err.message : "Failed to connect wallet.",
      }));
    }
  }, [loadBalance]);

  const disconnect = useCallback(async () => {
    await disconnectWallet();
    window.localStorage.removeItem(STORAGE_KEY);
    setState({
      address: null,
      isConnected: false,
      isConnecting: false,
      xlmBalance: null,
      error: null,
    });
  }, []);

  const fund = useCallback(async () => {
    if (!state.address) return;
    setState((prev) => ({ ...prev, error: null }));
    try {
      await fundWithFriendbot(state.address);
      await loadBalance(state.address);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Funding failed.",
      }));
    }
  }, [state.address, loadBalance]);

  const refresh = useCallback(async () => {
    if (state.address) await loadBalance(state.address);
  }, [state.address, loadBalance]);

  return { ...state, connect, disconnect, fund, refresh };
}
