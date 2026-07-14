/** Domain types for the InterChangableTrade marketplace. */

export type AssetCategory =
  | "stablecoin"
  | "commodity"
  | "equity"
  | "real-estate"
  | "collectible";

export interface Asset {
  id: string;
  code: string;
  name: string;
  issuer: string;
  category: AssetCategory;
  price: number;
  change24h: number;
  supply: number;
  description: string;
}

export interface Holding {
  asset: Asset;
  balance: number;
}

export type TradeSide = "buy" | "sell";

export interface TradeOrder {
  assetId: string;
  side: TradeSide;
  amount: number;
  price: number;
}
