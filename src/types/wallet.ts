export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
}

export interface WalletContextValue extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
}
