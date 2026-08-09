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
