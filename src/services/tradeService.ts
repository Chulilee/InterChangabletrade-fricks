"use client";

import type { Asset, TradeSide } from "@/types/asset";
import { buildDexOfferTx, buildTrustlineTx } from "@/lib/stellar/dex";
import { signAndSubmit } from "@/lib/stellar/wallet";
import { accountExists, getBalances, type AssetRef } from "@/lib/stellar/horizon";
import { txExplorerUrl } from "@/lib/stellar/config";

const XLM: AssetRef = { code: "XLM", issuer: null };

export interface PlaceOrderInput {
  asset: Asset;
  side: TradeSide;
  /** Amount of the asset to trade. */
  amount: number;
  /** Price of one unit of the asset, denominated in XLM. */
  price: number;
  /** Connected wallet public key. */
  address: string;
}

export interface PlaceOrderResult {
  /** Ledger transaction hash of the DEX offer. */
  hash: string;
  explorerUrl: string;
  /** Hash of the trustline transaction, if one had to be created first. */
  trustlineHash?: string;
}

function hasTrustline(
  balances: Awaited<ReturnType<typeof getBalances>>,
  ref: AssetRef,
): boolean {
  return balances.some((b) => b.code === ref.code && b.issuer === ref.issuer);
}

/**
 * Place a real order on the Stellar Testnet DEX using the connected wallet.
 *
 * Buying a token requires a trustline to receive it; if the account lacks one
 * it is created (and signed) first. The offer itself is a `manageBuyOffer` /
 * `manageSellOffer` that settles on the ledger's native order book.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const { asset, side, amount, price, address } = input;

  if (!(await accountExists(address))) {
    throw new Error(
      "This account isn't funded on the network yet. Fund it, then try again.",
    );
  }

  const base: AssetRef = { code: asset.code, issuer: asset.issuer };
  const balances = await getBalances(address);

  let trustlineHash: string | undefined;
  const needsTrustline = side === "buy" && !hasTrustline(balances, base);
  if (needsTrustline) {
    const trustTx = await buildTrustlineTx(address, base);
    trustlineHash = await signAndSubmit(trustTx, address);
  }

  const offerTx = await buildDexOfferTx({
    publicKey: address,
    base,
    counter: XLM,
    side,
    amount: String(amount),
    price: String(price),
  });
  const hash = await signAndSubmit(offerTx, address);

  return { hash, explorerUrl: txExplorerUrl(hash), trustlineHash };
}
