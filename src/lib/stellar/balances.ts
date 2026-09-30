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

/**
 * True when the entry describes the native lumen balance.
 *
 * Deliberately not a type predicate: the native entry has no asset code or
 * issuer, so there is no narrower shape worth asserting to the caller.
 */
export function isNativeBalanceEntry(entry: HorizonBalanceEntry): boolean {
  return entry.asset_type === "native";
}

/**
 * True when the entry describes a trustline balance.
 *
 * Checking `asset_type` explicitly is what makes the cast-free access to
 * `asset_code` / `asset_issuer` sound: the predicate only fires for the two
 * trustline asset types, and only those carry the fields.
 */
export function isCreditBalanceEntry(
  entry: HorizonBalanceEntry,
): entry is HorizonCreditBalanceEntry {
  return (
    entry.asset_type === "credit_alphanum4" ||
    entry.asset_type === "credit_alphanum12"
  );
}

/** True for any asset type this module knows how to turn into a `Balance`. */
export function isSupportedBalanceEntry(entry: HorizonBalanceEntry): boolean {
  return isNativeBalanceEntry(entry) || isCreditBalanceEntry(entry);
}

/**
 * Turn one Horizon balance entry into a `Balance`.
 *
 * Returns `null` for anything this app cannot represent: an unrecognised
 * `asset_type`, or a trustline entry that arrived without its code or issuer.
 * The caller decides what to do with the gap; the entry is logged rather than
 * dropped silently so an unexpected type is visible instead of showing up later
 * as a balance that quietly never existed.
 */
export function toBalance(entry: HorizonBalanceEntry): Balance | null {
  if (isNativeBalanceEntry(entry)) {
    return {
      code: NATIVE_ASSET_CODE,
      issuer: null,
      balance: entry.balance,
    };
  }

  if (isCreditBalanceEntry(entry)) {
    // Guarded above, so both of these are real fields, not a cast.
    if (!entry.asset_code || !entry.asset_issuer) {
      console.warn(
        `[stellar] Skipping ${entry.asset_type} balance with no asset code or issuer:`,
        entry,
      );
      return null;
    }

    return {
      code: entry.asset_code,
      issuer: entry.asset_issuer,
      balance: entry.balance,
    };
  }

  console.warn(
    `[stellar] Skipping balance with unsupported asset_type "${entry.asset_type}":`,
    entry,
  );
  return null;
}

/**
 * Parse a whole Horizon balance array, dropping every entry that could not be
 * mapped. An account with one unusable entry still yields its usable balances.
 */
export function toBalances(
  entries: readonly HorizonBalanceEntry[],
): Balance[] {
  const balances: Balance[] = [];

  for (const entry of entries) {
    const balance = toBalance(entry);
    if (balance) {
      balances.push(balance);
    }
  }

  return balances;
}