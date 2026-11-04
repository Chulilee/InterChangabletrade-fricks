/**
 * Trading pairs the order API accepts.
 *
 * The internal matching engine trades against a seeded order book keyed by
 * these symbols, so an order for any other pair could rest forever without a
 * counterparty. Route handlers validate `pair` against this list before
 * submitting, rejecting unknown pairs with 400 and the valid alternatives.
 */
export const SUPPORTED_TRADING_PAIRS = [
  "BTC/USDT",
  "ETH/USDT",
  "XLM/USDT",
  "USDC/XLM",
  "XAU/USDT",
  "ACME/USDT",
] as const;

export type SupportedTradingPair = (typeof SUPPORTED_TRADING_PAIRS)[number];

/** True when `pair` is a symbol the exchange supports. */
export function isSupportedTradingPair(pair: string): boolean {
  return (SUPPORTED_TRADING_PAIRS as readonly string[]).includes(pair);
}

/**
 * True when `pair` follows the `BASE/QUOTE` symbol shape even if it is not a
 * listed market, for use in error payloads that explain the expected format.
 */
export function looksLikeTradingPair(pair: string): boolean {
  return /^[A-Z0-9]{1,12}\/[A-Z0-9]{1,12}$/.test(pair);
}

/**
 * Every price/quantity number in an order draft must be finite. Non-finite
 * values (`NaN`, `Infinity`) would corrupt the order book if they reached the
 * matching engine.
 */
export function isFiniteOrderNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
