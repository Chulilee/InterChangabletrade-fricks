/**
 * Balance parsing for Horizon account responses.
 *
 * Deliberately free of the Stellar SDK so the mapping can be exercised without
 * a Horizon server, a network round trip or an SDK instance. Parsing lives here
 * rather than inside `getBalances` because it is the part with all the edge
 * cases, and the part most worth testing.
 */

/** Asset code, or "XLM" for the native lumen. */
export interface Balance {
  /** Asset code, or "XLM" for the native lumen. */
  code: string;
  /** Issuer public key, or null for native. */
  issuer: string | null;
  /** Amount held, as the decimal string Horizon returns. */
  balance: string;
}

/**
 * The part of a Horizon balance entry this module reads.
 *
 * `asset_code` and `asset_issuer` are optional because only trustline entries
 * carry them: every other entry shape still satisfies this type without them,
 * which is what lets an unexpected entry reach the parser and be rejected
 * there instead of blowing up on a field access.
 */
export interface HorizonBalanceEntry {
  asset_type: string;
  balance: string;
  asset_code?: string;
  asset_issuer?: string;
}

/** A balance entry proven to be a trustline balance. */
export interface HorizonCreditBalanceEntry extends HorizonBalanceEntry {
  asset_type: CreditAssetType;
  asset_code: string;
  asset_issuer: string;
}

/** The trustline asset types Horizon uses, shortest code first. */
export const CREDIT_ASSET_TYPES = [
  "credit_alphanum4",
  "credit_alphanum12",
] as const;

export type CreditAssetType = (typeof CREDIT_ASSET_TYPES)[number];

/** The asset code Horizon uses for the native lumen. */
export const NATIVE_ASSET_CODE = "XLM";