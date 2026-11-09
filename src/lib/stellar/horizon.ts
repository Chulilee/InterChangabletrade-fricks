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
import { assertValidAssetRef } from "./assetValidation";

export type { Balance };
export { FriendbotError };
export type { FriendbotErrorCode } from "./friendbot";

/**
 * Shared Horizon client.
 *
 * `stellarConfig` is resolved once at module load (see `./config.ts`) and is
 * therefore static for the lifetime of the process. Nevertheless, the client
 * is recreated on demand whenever `stellarConfig.horizonUrl` changes, so
 * tests (or future hot-reload / dynamic config) never keep a stale endpoint.
 * `resetHorizonClient()` clears the cache explicitly.
 */
let cachedClient: Horizon.Server | null = null;
let cachedUrl: string | null = null;

/** Returns the Horizon client for the current `stellarConfig.horizonUrl`. */
export function getHorizonClient(): Horizon.Server {
  const currentUrl = stellarConfig.horizonUrl;
  if (!cachedClient || cachedUrl !== currentUrl) {
    cachedClient = new Horizon.Server(currentUrl);
    cachedUrl = currentUrl;
  }
  return cachedClient;
}

/** Clears the cached Horizon client (for tests / config reloads). */
export function resetHorizonClient(): void {
  cachedClient = null;
  cachedUrl = null;
}

/**
 * Backwards-compatible named export. Delegates to {@link getHorizonClient}
 * on every property access so stale clients are never observed.
 * @deprecated Use `getHorizonClient()` directly.
 */
export const horizon: Horizon.Server = new Proxy({} as Horizon.Server, {
  get(_target, prop) {
    const client = getHorizonClient() as unknown as Record<string | symbol, unknown>;
    const value = client[prop];
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});

/** A trading asset expressed as code/issuer. Native XLM has a null issuer. */
export interface AssetRef {
  code: string;
  issuer: string | null;
}

export function toSdkAsset(ref: AssetRef): Asset {
  assertValidAssetRef(ref);
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
    await getHorizonClient().loadAccount(publicKey);
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
  const account = await getHorizonClient().loadAccount(publicKey);
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
  if (stellarConfig.network !== "testnet" || !stellarConfig.friendbotUrl) {
    throw new FriendbotError({ code: "unsupported_network" });
  }
  await fundAccountWithFriendbot(publicKey, {
    friendbotUrl: stellarConfig.friendbotUrl,
  });
}

/** Submit a signed transaction and return the confirmed hash. */
export async function submitTransaction(
  tx: Transaction | FeeBumpTransaction,
): Promise<Horizon.HorizonApi.SubmitTransactionResponse> {
  return getHorizonClient().submitTransaction(tx);
}
