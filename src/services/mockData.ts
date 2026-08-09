import type { Asset } from "@/types/asset";

/**
 * Seed catalogue for the marketplace UI. Issuers are real, valid Stellar
 * accounts so each asset can be turned into an on-chain `Asset(code, issuer)`
 * and traded on the Testnet DEX. USDC uses Circle's Testnet issuer; the others
 * are illustrative Testnet issuers. Prices/supplies are display-only.
 */
export const MOCK_ASSETS: Asset[] = [
  {
    id: "usdc",
    code: "USDC",
    name: "USD Coin",
    issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    category: "stablecoin",
    price: 1.0,
    change24h: 0.01,
    supply: 45_000_000,
    description:
      "A fully-collateralized US dollar stablecoin issued on the Stellar network.",
  },
  {
    id: "gold",
    code: "XAU",
    name: "Tokenized Gold",
    issuer: "GA5YXCZ7FGU65RSEUE42IFMHHQIJWQ4PLUW7NROO6CVM6G7NZH6UJPZG",
    category: "commodity",
    price: 2_385.42,
    change24h: -0.63,
    supply: 12_500,
    description:
      "Each token is backed by one gram of allocated, vaulted physical gold.",
  },
  {
    id: "acme",
    code: "ACME",
    name: "Acme Corp Equity",
    issuer: "GCZJUALNVSERNNB5TNAYIY44AIML6EJU5PO3IFK7SZYW3PIWNQKE5BLC",
    category: "equity",
    price: 128.75,
    change24h: 2.14,
    supply: 1_000_000,
    description:
      "Tokenized common stock representing fractional ownership of Acme Corp.",
  },
  {
    id: "loft",
    code: "LOFT",
    name: "Downtown Loft Fund",
    issuer: "GCM6VQNUPPNJYKP7OGC6SZLCZR23JCS6YXJBSH7NWJRL3L67QWOY4AHV",
    category: "real-estate",
    price: 512.9,
    change24h: 0.42,
    supply: 80_000,
    description:
      "A yield-bearing token representing a share in a portfolio of urban lofts.",
  },
];
