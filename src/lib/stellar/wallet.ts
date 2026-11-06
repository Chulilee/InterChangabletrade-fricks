"use client";

import {
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { stellarConfig } from "./config";
import { submitTransaction } from "./horizon";

/**
 * Thin wrapper around Stellar Wallets Kit (Freighter, xBull, Albedo, …).
 *
 * The kit ships as browser web-components, so it is imported dynamically to keep
 * it out of the server bundle. All functions here are safe to call only from the
 * browser (event handlers, effects).
 */

type KitModule = typeof import("@creit.tech/stellar-wallets-kit");

/** Default maximum attempts for one kit initialization (initial try + 2 retries). */
export const DEFAULT_KIT_INIT_ATTEMPTS = 3;
/** Default initial backoff delay in milliseconds; doubles per attempt. */
export const DEFAULT_KIT_INIT_BASE_DELAY_MS = 250;

/** Error thrown when the kit cannot be initialized after every attempt. */
export class WalletInitializationError extends Error {
  /** The underlying failure from the final attempt. */
  readonly cause: unknown;
  /** How many attempts were made. */
  readonly attempts: number;

  constructor(message: string, options: { cause: unknown; attempts: number }) {
    super(message);
    this.name = "WalletInitializationError";
    this.cause = options.cause;
    this.attempts = options.attempts;
  }
}

export interface WalletKitInitOptions {
  /** Total attempts before surfacing; minimum 1. Defaults to {@link DEFAULT_KIT_INIT_ATTEMPTS}. */
  attempts?: number;
  /** Initial backoff delay; doubles after every failed attempt. Defaults to {@link DEFAULT_KIT_INIT_BASE_DELAY_MS}. */
  baseDelayMs?: number;
  /** Injectable sleep for tests. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function causeMessage(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  return String(cause ?? "unknown error");
}

/**
 * Runs `operation` with exponential backoff between attempts and converts the
 * terminal failure into a descriptive {@link WalletInitializationError}.
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: WalletKitInitOptions = {},
): Promise<T> {
  const attempts = Math.max(1, Math.floor(options.attempts ?? DEFAULT_KIT_INIT_ATTEMPTS));
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? DEFAULT_KIT_INIT_BASE_DELAY_MS);
  const sleep = options.sleep ?? defaultSleep;

  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await sleep(baseDelayMs * 2 ** attempt);
      }
    }
  }

  throw new WalletInitializationError(
    `Failed to initialize the Stellar wallets kit after ${attempts} attempt(s): ${causeMessage(lastError)}`,
    { cause: lastError, attempts },
  );
}

async function loadKit(): Promise<KitModule["StellarWalletsKit"]> {
  const [{ StellarWalletsKit, Networks }, freighter, xbull, albedo] =
    await Promise.all([
      import("@creit.tech/stellar-wallets-kit"),
      import("@creit.tech/stellar-wallets-kit/modules/freighter"),
      import("@creit.tech/stellar-wallets-kit/modules/xbull"),
      import("@creit.tech/stellar-wallets-kit/modules/albedo"),
    ]);

  StellarWalletsKit.init({
    network:
      stellarConfig.network === "public"
        ? Networks.PUBLIC
        : Networks.TESTNET,
    modules: [
      new freighter.FreighterModule(),
      new xbull.xBullModule(),
      new albedo.AlbedoModule(),
    ],
  });

  return StellarWalletsKit;
}

let kitPromise: Promise<KitModule["StellarWalletsKit"]> | null = null;

/**
 * Returns the initialized kit, initializing it on first call.
 *
 * The result is cached, but a *failed* initialization is never cached: the
 * rejected promise resets the cache before rejecting, so the next call
 * retries from scratch. Initialization itself is retried with exponential
 * backoff via {@link retryWithBackoff}, and failures surface as
 * {@link WalletInitializationError} with the underlying cause attached.
 */
export async function getKit(
  options?: WalletKitInitOptions,
): Promise<KitModule["StellarWalletsKit"]> {
  if (!kitPromise) {
    kitPromise = retryWithBackoff(loadKit, options).catch((error) => {
      // Do not cache the failure: the next call must be able to retry.
      kitPromise = null;
      throw error;
    });
  }
  return kitPromise;
}

/** Open the wallet-selection modal and return the connected address. */
export async function connectWallet(): Promise<string> {
  const kit = await getKit();
  const { address } = await kit.authModal();
  return address;
}

/**
 * List the wallet modules the kit detects as installed in this browser.
 *
 * Albedo counts as installed (it is a hosted web flow); Freighter/xBull report
 * themselves when their extension/app is present. Returns an empty list when
 * no wallet is available (or detection fails), so callers can fail fast with
 * a useful message instead of opening a modal that would close itself.
 */
export async function getAvailableWallets(): Promise<
  { id: string; name: string }[]
> {
  try {
    const kit = await getKit();
    // The installed-wallet API is not part of the kit's declared type surface
    // in every 2.x release we may resolve against, so access it structurally:
    // when the method is missing at runtime the result is an empty list.
    const withDetection = kit as unknown as {
      getInstalledWallets?: () => Promise<Array<{ id?: string; name?: string }>>;
    };
    if (typeof withDetection.getInstalledWallets !== "function") {
      return [];
    }
    const wallets = await withDetection.getInstalledWallets();
    return wallets.map((wallet) => ({
      id: String(wallet?.id ?? ""),
      name: String(wallet?.name ?? ""),
    }));
  } catch {
    /* detection is best-effort; an empty result gates connect() in the hook */
    return [];
  }
}

/**
 * Map a wallet-connection failure to a user-facing message per failure mode.
 *
 * The Stellar Wallets Kit surfaces user rejections and connectivity problems
 * as plain `Error`s with human-readable messages rather than typed codes, so
 * this is best-effort message pattern matching with a generic fallback for
 * the unexpected cases.
 */
export function classifyConnectError(err: unknown): string {
  const text = (
    err instanceof Error ? err.message : String(err ?? "")
  ).toLowerCase();

  // User closed the modal or rejected the request from the wallet UI.
  if (/declin|reject|denied|cancel|abort|dismiss|clos/.test(text)) {
    return "Connection rejected. Approve the connection request in your wallet and try again.";
  }

  // No wallet was reachable at all.
  if (/not.?install|no wallet|wallet.?not|extension|freighter|xbull/.test(text)) {
    return "Wallet not installed. Install Freighter or xBull, or connect via Albedo.";
  }

  // Connectivity problems reaching the wallet or the Stellar network.
  if (/network|offline|timed? ?out|failed to fetch|dns|socket|refused|unreachable/.test(text)) {
    return "Network error. Check your connection and try again.";
  }

  return "Failed to connect wallet.";
}

/** Read the currently connected address from the kit, if any. */
export async function getConnectedAddress(): Promise<string | null> {
  try {
    const kit = await getKit();
    const { address } = await kit.getAddress();
    return address || null;
  } catch {
    return null;
  }
}

export async function disconnectWallet(): Promise<void> {
  try {
    const kit = await getKit();
    await kit.disconnect();
  } catch {
    /* nothing to disconnect */
  }
}

/** Sign an unsigned transaction with the connected wallet and return signed XDR. */
export async function signTransaction(
  tx: Transaction,
  address: string,
): Promise<string> {
  const kit = await getKit();
  const { signedTxXdr } = await kit.signTransaction(tx.toXDR(), {
    address,
    networkPassphrase: stellarConfig.networkPassphrase,
  });

  // Validate that the signed XDR can be parsed back successfully
  // This catches cases where the wallet returns malformed XDR
  try {
    TransactionBuilder.fromXDR(signedTxXdr, stellarConfig.networkPassphrase);
  } catch (parseError) {
    throw new Error(
      `Wallet returned invalid signed XDR that cannot be parsed: ` +
        `${parseError instanceof Error ? parseError.message : String(parseError)}. ` +
        `Original XDR length: ${signedTxXdr.length}.`
    );
  }

  return signedTxXdr;
}

/**
 * Sign an unsigned transaction with the connected wallet and broadcast it to the
 * network. Returns the confirmed ledger transaction hash.
 */
export async function signAndSubmit(
  tx: Transaction,
  address: string,
): Promise<string> {
  const signedXdr = await signTransaction(tx, address);
  const signed = TransactionBuilder.fromXDR(
    signedXdr,
    stellarConfig.networkPassphrase,
  ) as Transaction;
  const result = await submitTransaction(signed);
  return result.hash;
}
