export interface WalletState {
  /** Stellar public key (G...) of the connected account, or null. */
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  /** Native XLM balance as a decimal string, when known. */
  xlmBalance: string | null;
  /** Populated when the last wallet action failed. */
  error: string | null;
}

export interface WalletContextValue extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  /** Fund the connected account via Friendbot (Testnet only). */
  fund: () => Promise<void>;
  /** Re-read balances from Horizon. */
  refresh: () => Promise<void>;
}
