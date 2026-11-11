"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { WalletContextValue, WalletState } from "@/types/wallet";
import {
  classifyConnectError,
  connectWallet,
  disconnectWallet,
  getConnectedAddress,
  getAvailableWallets,
} from "@/lib/stellar/wallet";
import {
  accountExists,
  fundWithFriendbot,
  getNativeBalance,
} from "@/lib/stellar/horizon";
import { stellarConfig } from "@/lib/stellar/config";

const STORAGE_KEY = "ict.wallet.address";

const INITIAL_STATE: WalletState = {
  address: null,
  isConnected: false,
  isConnecting: false,
  xlmBalance: null,
  error: null,
};

const WalletContext = createContext<WalletContextValue | null>(null);

/**
 * Wallet provider backed by Stellar Wallets Kit. `connect()` opens the real
 * Freighter / xBull / Albedo modal and returns an on-chain account; balances
 * are read from Horizon on the configured network (Testnet by default).
 *
 * The state lives here instead of in the hook, so every consumer — the
 * navigation bar, the wallet button, the trade panel — reads the same value
 * and re-renders together when the wallet connects or disconnects. A hook
 * that kept its own copy of the state left each consumer showing whatever
 * it happened to know, which is how stale connection states appeared.
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>(INITIAL_STATE);

  /**
   * Id of the most recent wallet operation.
   *
   * Every asynchronous step compares its own id with this one before it
   * touches the state, so a slow connect (or a session restore) can never
   * overwrite a newer disconnect: the last operation always wins.
   */
  const latestOperation = useRef(0);

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
    const operation = ++latestOperation.current;
    let cancelled = false;
    (async () => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const active = (await getConnectedAddress()) ?? stored;
      if (cancelled || operation !== latestOperation.current) return;
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
    const operation = ++latestOperation.current;
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));
    try {
      // Fail fast with a clear message when no wallet is detected instead of
      // opening the selection modal, which would close itself immediately.
      const wallets = await getAvailableWallets();
      if (operation !== latestOperation.current) return;
      if (wallets.length === 0) {
        setState((prev) => ({
          ...prev,
          isConnecting: false,
          error:
            "Wallet not installed. Install Freighter or xBull, or connect via Albedo.",
        }));
        return;
      }

      const address = await connectWallet();
      // The user may have disconnected while the wallet modal was open; that
      // newer operation wins and this result is dropped.
      if (operation !== latestOperation.current) return;
      window.localStorage.setItem(STORAGE_KEY, address);
      setState((prev) => ({
        ...prev,
        address,
        isConnected: true,
        isConnecting: false,
      }));
      void loadBalance(address);
    } catch (err) {
      if (operation !== latestOperation.current) return;
      // Log the raw failure for debugging; surface a message that matches the
      // failure mode (user rejected, no wallet, network problem, …).
      console.error("[useWallet] connect failed:", err);
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: classifyConnectError(err),
      }));
    }
  }, [loadBalance]);

  const disconnect = useCallback(async () => {
    // Invalidate anything still in flight so a pending connect cannot
    // re-connect the interface after the user disconnected.
    ++latestOperation.current;
    await disconnectWallet();
    window.localStorage.removeItem(STORAGE_KEY);
    setState({ ...INITIAL_STATE });
  }, []);

  const fund = useCallback(async () => {
    const address = state.address;
    if (!address) return;
    const operation = latestOperation.current;
    if (stellarConfig.network !== "testnet") {
      setState((prev) => ({
        ...prev,
        error: "Funding only available on Testnet",
      }));
      return;
    }
    setState((prev) => ({ ...prev, error: null }));
    try {
      await fundWithFriendbot(address);
      if (operation !== latestOperation.current) return;
      await loadBalance(address);
    } catch (err) {
      if (operation !== latestOperation.current) return;
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Funding failed.",
      }));
    }
  }, [state.address, loadBalance]);

  const refresh = useCallback(async () => {
    if (state.address) await loadBalance(state.address);
  }, [state.address, loadBalance]);

  const value: WalletContextValue = {
    ...state,
    connect,
    disconnect,
    fund,
    refresh,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

/**
 * Read the shared wallet state.
 *
 * Throws when it is used outside a {@link WalletProvider}: without the
 * provider every consumer would keep a private copy of the state, which is
 * exactly the stale-state bug this provider replaces.
 */
export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return ctx;
}
