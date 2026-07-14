"use client";

import { useCallback, useEffect, useState } from "react";
import type { WalletContextValue, WalletState } from "@/types/wallet";

const STORAGE_KEY = "ict.wallet.address";

/**
 * Minimal wallet hook. In production this wraps the Stellar Wallets Kit to
 * negotiate a connection with Freighter, Albedo, xBull and other providers.
 * For the scaffold it persists a mock address so the UI is fully navigable.
 */
export function useWallet(): WalletContextValue {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
  });

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setState({ address: stored, isConnected: true, isConnecting: false });
    }
  }, []);

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isConnecting: true }));

    // TODO: replace with StellarWalletsKit.openModal() + getAddress().
    const mockAddress =
      "GDMOCK" + Math.random().toString(36).slice(2, 10).toUpperCase();

    window.localStorage.setItem(STORAGE_KEY, mockAddress);
    setState({ address: mockAddress, isConnected: true, isConnecting: false });
  }, []);

  const disconnect = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setState({ address: null, isConnected: false, isConnecting: false });
  }, []);

  return { ...state, connect, disconnect };
}
