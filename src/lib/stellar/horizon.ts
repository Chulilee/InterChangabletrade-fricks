import {
  Asset,
  Horizon,
  NotFoundError,
  Transaction,
  FeeBumpTransaction,
} from "@stellar/stellar-sdk";
import { stellarConfig } from "./config";
import { toBalances, type Balance } from "./balances";
import { fundAccountWithFriendbot, FriendbotError } from "./friendbot";

export type { Balance };
export { FriendbotError };
export type { FriendbotErrorCode } from "./friendbot";

/** Shared Horizon client pointed at the configured network. */
export const horizon = new Horizon.Server(stellarConfig.horizonUrl);

/** A trading asset expressed as code/issuer. Native XLM has a null issuer. */
export interface AssetRef {
  code: string;
  issuer: string | null;
}

export function toSdkAsset(ref: AssetRef): Asset {
  if (!ref.issuer || ref.code.toUpperCase() === "XLM") {
    return Asset.native();
  }
  return new Asset(ref.code, ref.issuer);
}

export function isNative(ref: AssetRef): boolean {
  return !ref.issuer || ref.code.toUpperCase() === "XLM";
}

/** True when Horizon has no record of the account (needs funding). */
export async function accountExists(publicKey: string): Promise<boolean> {
  try {
    await horizon.loadAccount(publicKey);
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) {
      return false;
    }
    throw err;
  }
}

/**
 * Every balance this app can represent for an account.
 *
 * Horizon also reports entries with no representation here, most commonly
 * liquidity pool positions, and can add asset types this build has never seen.
 * Those are logged and skipped rather than being surfaced as a balance with an
 * undefined asset code, so the returned list only ever holds native and
 * trustline balances and callers can match on `code` and `issuer` directly.
 */
export async function getBalances(publicKey: string): Promise<Balance[]> {
  const account = await horizon.loadAccount(publicKey);
  return toBalances(account.balances);
}

export async function getNativeBalance(publicKey: string): Promise<string> {
  const balances = await getBalances(publicKey);
  return balances.find((b) => b.issuer === null)?.balance ?? "0";
}

/**
 * Fund an account on Testnet via Friendbot. Throws `FriendbotError` when the
 * faucet is unavailable or rejects the request; funding an account that
 * already exists is treated as success.
 */
export async function fundWithFriendbot(publicKey: string): Promise<void> {
  await fundAccountWithFriendbot(publicKey, {
    friendbotUrl: stellarConfig.friendbotUrl,
  });
}

/** Submit a signed transaction and return the confirmed hash. */
export async function submitTransaction(
  tx: Transaction | FeeBumpTransaction,
): Promise<Horizon.HorizonApi.SubmitTransactionResponse> {
  return horizon.submitTransaction(tx);
}
