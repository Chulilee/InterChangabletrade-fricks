import { Networks } from "@stellar/stellar-sdk";

/**
 * Network configuration for the InterChangableTrade app.
 *
 * The active network is chosen with NEXT_PUBLIC_STELLAR_NETWORK ("testnet" |
 * "public"), defaulting to Testnet. Individual endpoints can be overridden via
 * env for custom Horizon / RPC deployments.
 */
export type StellarNetwork = "testnet" | "public";

export interface StellarConfig {
  network: StellarNetwork;
  networkPassphrase: string;
  horizonUrl: string;
  sorobanRpcUrl: string;
  explorerBaseUrl: string;
  /** Friendbot endpoint (Testnet only). `null` on public network. */
  friendbotUrl: string | null;
}

const BASE: Record<StellarNetwork, StellarConfig> = {
  testnet: {
    network: "testnet",
    networkPassphrase: Networks.TESTNET,
    horizonUrl: "https://horizon-testnet.stellar.org",
    sorobanRpcUrl: "https://soroban-testnet.stellar.org",
    explorerBaseUrl: "https://stellar.expert/explorer/testnet",
    friendbotUrl: "https://friendbot.stellar.org",
  },
  public: {
    network: "public",
    networkPassphrase: Networks.PUBLIC,
    horizonUrl: "https://horizon.stellar.org",
    sorobanRpcUrl: "https://mainnet.sorobanrpc.com",
    explorerBaseUrl: "https://stellar.expert/explorer/public",
    friendbotUrl: null,
  },
};

function resolveNetwork(): StellarNetwork {
  const raw = (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet").toLowerCase();
  return raw === "public" || raw === "mainnet" ? "public" : "testnet";
}

const network = resolveNetwork();
const base = BASE[network];

export const stellarConfig: StellarConfig = {
  ...base,
  horizonUrl: process.env.NEXT_PUBLIC_HORIZON_URL ?? base.horizonUrl,
  sorobanRpcUrl: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? base.sorobanRpcUrl,
};

export function txExplorerUrl(hash: string): string {
  return `${stellarConfig.explorerBaseUrl}/tx/${hash}`;
}

export function accountExplorerUrl(address: string): string {
  return `${stellarConfig.explorerBaseUrl}/account/${address}`;
}
