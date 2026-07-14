import type { Asset } from "@/types/asset";

/**
 * Seed data standing in for the InterChangableTrade-Core API. Prices and
 * supplies are illustrative and refreshed by the service layer on read.
 */
export const MOCK_ASSETS: Asset[] = [
  {
    id: "usdc",
    code: "USDC",
    name: "USD Coin",
    issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
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
    issuer: "GBGOLDXAU7YHZ2QK5W3M4N6P8R9T2V4X6Z8B0D2F4H6J8L0N2P4R6T8",
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
    issuer: "GAEQUITYACME3H5J7L9N1P3R5T7V9X1Z3B5D7F9H1J3L5N7P9R1T3V5",
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
    issuer: "GAREALESTLOFT4I6K8M0O2Q4S6U8W0Y2A4C6E8G0I2K4M6O8Q0S2U4",
    category: "real-estate",
    price: 512.9,
    change24h: 0.42,
    supply: 80_000,
    description:
      "A yield-bearing token representing a share in a portfolio of urban lofts.",
  },
];
