import {
  Asset,
  Horizon,
  NotFoundError,
  Transaction,
  FeeBumpTransaction,
} from "@stellar/stellar-sdk";
import { stellarConfig } from "./config";
import { toBalances, type Balance } from "./balances";

export type { Balance };

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
 * Fund an account on Testnet via Friendbot. No-op error on the public network,
 * where Friendbot does not exist.
 */
export async function fundWithFriendbot(publicKey: string): Promise<void> {
  if (!stellarConfig.friendbotUrl) {
    throw new Error("Friendbot funding is only available on Testnet.");
  }
  const res = await fetch(
    `${stellarConfig.friendbotUrl}?addr=${encodeURIComponent(publicKey)}`,
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // Friendbot returns 400 if the account is already funded — treat as success.
    if (body.includes("op_already_exists") || body.includes("createAccountAlreadyExist")) {
      return;
    }
    throw new Error(`Friendbot funding failed (${res.status}): ${body.slice(0, 200)}`);
  }
}

/** Submit a signed transaction and return the confirmed hash. */
export async function submitTransaction(
  tx: Transaction | FeeBumpTransaction,
): Promise<Horizon.HorizonApi.SubmitTransactionResponse> {
  return horizon.submitTransaction(tx);
}
