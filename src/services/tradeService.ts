"use client";

import { BASE_FEE } from "@stellar/stellar-sdk";
import type { Asset, TradeSide } from "@/types/asset";
import { buildDexOfferTx, buildTrustlineTx, buildRemoveTrustlineTx } from "@/lib/stellar/dex";
import { signAndSubmit } from "@/lib/stellar/wallet";
import { accountExists, getBalances, type AssetRef } from "@/lib/stellar/horizon";
import { txExplorerUrl } from "@/lib/stellar/config";

const XLM: AssetRef = { code: "XLM", issuer: null };

/** Stellar base fee in stroops (100 stroops = 0.00001 XLM) */
export const STELLAR_BASE_FEE_STROOPS = BASE_FEE;

/** Convert stroops to XLM */
export function stroopsToXlm(stroops: number): number {
  return stroops / 1e7;
}

/** Convert XLM to stroops */
export function xlmToStroops(xlm: number): number {
  return Math.round(xlm * 1e7);
}

export interface FeeEstimate {
  /** Estimated fee for trustline creation (if needed) in stroops */
  trustlineFeeStroops: number;
  /** Estimated fee for DEX offer in stroops */
  offerFeeStroops: number;
  /** Total estimated fee in stroops */
  totalFeeStroops: number;
  /** Total estimated fee in XLM */
  totalFeeXlm: number;
  /** Whether a trustline is needed */
  needsTrustline: boolean;
}

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
  /** Fee information for the transaction */
  fees: FeeEstimate;
}

function hasTrustline(
  balances: Awaited<ReturnType<typeof getBalances>>,
  ref: AssetRef,
): boolean {
  return balances.some((b) => b.code === ref.code && b.issuer === ref.issuer);
}

/**
 * Estimate the fees for placing an order.
 * 
 * On Stellar, each operation costs BASE_FEE (100 stroops = 0.00001 XLM).
 * - Trustline creation: 1 operation (changeTrust)
 * - DEX offer: 1 operation (manageBuyOffer/manageSellOffer)
 * 
 * @param input - Order input parameters
 * @returns Fee estimate with breakdown
 */
export async function estimateOrderFees(input: PlaceOrderInput): Promise<FeeEstimate> {
  const { asset, side, address } = input;
  
  const base: AssetRef = { code: asset.code, issuer: asset.issuer };
  const balances = await getBalances(address);
  const needsTrustline = side === "buy" && !hasTrustline(balances, base);
  
  // Each operation costs BASE_FEE stroops
  const trustlineOps = needsTrustline ? 1 : 0;
  const offerOps = 1;
  const totalOps = trustlineOps + offerOps;
  
  const baseFee = Number(BASE_FEE);
  const trustlineFeeStroops = trustlineOps * baseFee;
  const offerFeeStroops = offerOps * baseFee;
  const totalFeeStroops = totalOps * baseFee;
  
  return {
    trustlineFeeStroops,
    offerFeeStroops,
    totalFeeStroops,
    totalFeeXlm: stroopsToXlm(totalFeeStroops),
    needsTrustline,
  };
}

/**
 * Estimate the total cost of an order including fees.
 * 
 * For buy orders: cost = amount * price + fees (in XLM)
 * For sell orders: cost = fees only (fees paid in XLM)
 * 
 * @param input - Order input parameters
 * @returns Total cost estimate
 */
export async function estimateOrderTotalCost(input: PlaceOrderInput): Promise<{
  fees: FeeEstimate;
  /** Total XLM needed for buy orders (amount * price + fees) */
  totalXlmNeeded: number;
  /** Amount of base asset being traded */
  baseAmount: number;
  /** Counter amount (for buy orders) */
  counterAmount: number;
}> {
  const { side, amount, price } = input;
  
  const fees = await estimateOrderFees(input);
  
  if (side === "buy") {
    const counterAmount = amount * price; // XLM needed to buy the asset
    return {
      fees,
      totalXlmNeeded: counterAmount + fees.totalFeeXlm,
      baseAmount: amount,
      counterAmount,
    };
  } else {
    // For sell orders, you need XLM for fees only
    return {
      fees,
      totalXlmNeeded: fees.totalFeeXlm,
      baseAmount: amount,
      counterAmount: amount * price,
    };
  }
}

/**
 * Check if the account has sufficient balance for the order including fees.
 * 
 * @param input - Order input parameters
 * @returns Balance check result
 */
export async function checkOrderBalance(input: PlaceOrderInput): Promise<{
  sufficient: boolean;
  /** Available XLM balance */
  availableXlm: number;
  /** Required XLM */
  requiredXlm: number;
  /** Shortfall if insufficient */
  shortfall?: number;
  fees: FeeEstimate;
  /** Balances used for the decision (lets callers avoid a second fetch). */
  balances: Awaited<ReturnType<typeof getBalances>>;
}> {
  const { address, side } = input;
  
  const balances = await getBalances(address);
  const nativeBalance = balances.find((b) => b.issuer === null);
  const availableXlm = parseFloat(nativeBalance?.balance ?? "0");
  
  const estimate = await estimateOrderTotalCost(input);
  
  if (side === "buy") {
    const sufficient = availableXlm >= estimate.totalXlmNeeded;
    return {
      sufficient,
      availableXlm,
      requiredXlm: estimate.totalXlmNeeded,
      shortfall: sufficient ? undefined : estimate.totalXlmNeeded - availableXlm,
      fees: estimate.fees,
      balances,
    };
  } else {
    // For sell orders, check if we have the asset to sell + XLM for fees
    const base: AssetRef = { code: input.asset.code, issuer: input.asset.issuer };
    const assetBalance = balances.find(
      (b) => b.code === base.code && b.issuer === base.issuer
    );
    const availableAsset = parseFloat(assetBalance?.balance ?? "0");
    
    const sufficient = availableAsset >= input.amount && availableXlm >= estimate.totalXlmNeeded;
    
    return {
      sufficient,
      availableXlm,
      requiredXlm: estimate.totalXlmNeeded,
      shortfall: sufficient ? undefined : Math.max(
        (input.amount - availableAsset) > 0 ? input.amount - availableAsset : 0,
        estimate.totalXlmNeeded - availableXlm
      ),
      fees: estimate.fees,
      balances,
    };
  }
}

/**
 * Place a real order on the Stellar Testnet DEX using the connected wallet.
 *
 * Buying a token requires a trustline to receive it; if the account lacks one
 * it is created (and signed) first. The offer itself is a `manageBuyOffer` /
 * `manageSellOffer` that settles on the ledger's native order book.
 * 
 * Now includes fee estimation and balance validation.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const { asset, side, amount, price, address } = input;

  // Validate order params before any network call.
  if (!(amount > 0) || !Number.isFinite(amount)) {
    throw new Error(`Order amount must be a positive number, got ${amount}`);
  }
  if (!(price > 0) || !Number.isFinite(price)) {
    throw new Error(`Order price must be a positive number, got ${price}`);
  }
  if (!address || typeof address !== "string" || address.trim() === "") {
    throw new Error("A connected wallet address is required to place an order");
  }

  if (!(await accountExists(address))) {
    throw new Error(
      "This account isn't funded on the network yet. Fund it, then try again.",
    );
  }

  // Pre-flight balance checks: no trustline/offer transactions are built
  // or signed if the order cannot possibly succeed.
  const balanceCheck = await checkOrderBalance(input);
  if (!balanceCheck.sufficient) {
    if (side === "buy") {
      throw new Error(
        `Insufficient XLM balance to buy: need ${balanceCheck.requiredXlm.toFixed(7)} XLM ` +
        `(${balanceCheck.fees.totalFeeXlm.toFixed(7)} XLM for fees), have ` +
        `${balanceCheck.availableXlm.toFixed(7)} XLM. Shortfall: ` +
        `${(balanceCheck.shortfall ?? 0).toFixed(7)} XLM.`,
      );
    }
    const baseForMsg: AssetRef = { code: asset.code, issuer: asset.issuer };
    const assetBalance = balanceCheck.balances.find(
      (b) => b.code === baseForMsg.code && b.issuer === baseForMsg.issuer,
    );
    const availableAsset = parseFloat(assetBalance?.balance ?? "0");
    const assetShortfall = Math.max(0, amount - availableAsset);
    const xlmShortfall = Math.max(0, balanceCheck.requiredXlm - balanceCheck.availableXlm);
    const reasons: string[] = [];
    if (assetShortfall > 0) {
      reasons.push(
        `need ${amount} ${baseForMsg.code}, have ${availableAsset.toFixed(7)} ` +
        `(shortfall ${assetShortfall.toFixed(7)} ${baseForMsg.code})`,
      );
    }
    if (xlmShortfall > 0) {
      reasons.push(
        `need ${balanceCheck.requiredXlm.toFixed(7)} XLM for fees, have ` +
        `${balanceCheck.availableXlm.toFixed(7)} XLM (shortfall ${xlmShortfall.toFixed(7)} XLM)`,
      );
    }
    throw new Error(`Insufficient balance to sell: ${reasons.join("; ")}.`);
  }

  const base: AssetRef = { code: asset.code, issuer: asset.issuer };
  const balances = balanceCheck.balances;

  let trustlineHash: string | undefined;
  let trustlineCreated = false;
  const needsTrustline = side === "buy" && !hasTrustline(balances, base);
  if (needsTrustline) {
    const trustTx = await buildTrustlineTx(address, base);
    trustlineHash = await signAndSubmit(trustTx, address);
    trustlineCreated = true;
  }

  let hash: string;
  try {
    const offerTx = await buildDexOfferTx({
      publicKey: address,
      base,
      counter: XLM,
      side,
      amount: String(amount),
      price: String(price),
    });
    hash = await signAndSubmit(offerTx, address);
  } catch (offerError) {
    // If trustline was created but offer failed, attempt to clean up the trustline
    if (trustlineCreated && needsTrustline) {
      try {
        const removeTrustlineTx = await buildRemoveTrustlineTx(address, base);
        await signAndSubmit(removeTrustlineTx, address);
        // Trustline cleaned up successfully
        trustlineHash = undefined;
      } catch (cleanupError) {
        // Log but don't throw - we already have an error to throw
        console.warn(
          `Trustline created but offer failed. Trustline cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}. ` +
            `User may need to manually remove trustline for ${base.code}${base.issuer ? ":" + base.issuer : ""}.`
        );
      }
    }
    throw offerError;
  }

  // Return fee info with the result
  const fees = await estimateOrderFees(input);
  
  return { hash, explorerUrl: txExplorerUrl(hash), trustlineHash, fees };
}
