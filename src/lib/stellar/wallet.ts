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

let kitPromise: Promise<KitModule["StellarWalletsKit"]> | null = null;

async function getKit() {
  if (!kitPromise) {
    kitPromise = (async () => {
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
    })();
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
    if (typeof kit.getInstalledWallets !== "function") {
      return [];
    }
    const wallets = await kit.getInstalledWallets();
    return wallets.map((wallet) => ({ id: wallet.id, name: wallet.name }));
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
