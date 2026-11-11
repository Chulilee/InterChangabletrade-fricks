import {
  Account,
  Asset,
  BASE_FEE,
  Operation,
  TransactionBuilder,
  Transaction,
} from "@stellar/stellar-sdk";
import { stellarConfig } from "./config";
import { horizon, toSdkAsset, isNative, type AssetRef } from "./horizon";
import { assertValidAssetRef } from "./assetValidation";

const TIMEOUT_SECONDS = 180;

function builder(source: Account): TransactionBuilder {
  return new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: stellarConfig.networkPassphrase,
  });
}

/**
 * Build an unsigned `changeTrust` transaction so `publicKey` can hold `asset`.
 * Required before a non-native asset can be received or traded.
 */
export async function buildTrustlineTx(
  publicKey: string,
  asset: AssetRef,
  limit?: string,
): Promise<Transaction> {
  assertValidAssetRef(asset, "Trustline asset");
  const source = await horizon.loadAccount(publicKey);
  return builder(source)
    .addOperation(
      Operation.changeTrust({
        asset: toSdkAsset(asset) as Asset,
        limit,
      }),
    )
    .setTimeout(TIMEOUT_SECONDS)
    .build();
}

/**
 * Build an unsigned `changeTrust` transaction to remove a trustline by setting
 * the limit to "0". This allows the account to close the trustline and recover
 * the minimum balance reserve (0.5 XLM).
 */
export async function buildRemoveTrustlineTx(
  publicKey: string,
  asset: AssetRef,
): Promise<Transaction> {
  assertValidAssetRef(asset, "Trustline asset");
  const source = await horizon.loadAccount(publicKey);
  return builder(source)
    .addOperation(
      Operation.changeTrust({
        asset: toSdkAsset(asset) as Asset,
        limit: "0",
      }),
    )
    .setTimeout(TIMEOUT_SECONDS)
    .build();
}

export type OrderSide = "buy" | "sell";

export interface DexOrderParams {
  /** The account placing the order. */
  publicKey: string;
  /** Asset being traded (e.g. USDC, gold token). */
  base: AssetRef;
  /** Asset used to price it (e.g. XLM). */
  counter: AssetRef;
  side: OrderSide;
  /** Amount of `base` to buy or sell, as a decimal string. */
  amount: string;
  /** Price of one unit of `base` denominated in `counter`, as a decimal string. */
  price: string;
  /** Existing offer id to replace; "0" (default) creates a new offer. */
  offerId?: string;
}

/**
 * Amount used when cancelling a resting offer.
 *
 * Stellar deletes an offer when the manage-offer operation carries an amount
 * of `0`, so a cancellation is the very same operation with a zero amount.
 */
const CANCEL_OFFER_AMOUNT = "0";

/**
 * Price used when cancelling a resting offer.
 *
 * The price does not take part in a deletion — the zero amount is what
 * removes the offer from the order book — so a cancellation sends a neutral
 * `0` instead of an invented price such as `1`.
 */
const CANCEL_OFFER_PRICE = "0";

/**
 * The assets exchanged by a DEX offer, in the ledger's selling/buying order.
 *
 * A "sell" of `base` sells `base` and buys `counter`; a "buy" sells `counter`
 * and buys `base`.
 */
function offerAssets(
  base: AssetRef,
  counter: AssetRef,
  side: OrderSide,
): { selling: Asset; buying: Asset } {
  return side === "sell"
    ? { selling: toSdkAsset(base), buying: toSdkAsset(counter) }
    : { selling: toSdkAsset(counter), buying: toSdkAsset(base) };
}

/**
 * Build the manage-offer operation for a DEX order.
 *
 * A "buy" is a `manageBuyOffer` and a "sell" a `manageSellOffer`; those are
 * the only offer operations the Stellar DEX accepts.
 */
function buildOfferOperation(params: {
  side: OrderSide;
  selling: Asset;
  buying: Asset;
  amount: string;
  price: string;
  offerId: string;
}) {
  const { side, selling, buying, amount, price, offerId } = params;
  return side === "buy"
    ? Operation.manageBuyOffer({
        selling,
        buying,
        buyAmount: amount,
        price,
        offerId,
      })
    : Operation.manageSellOffer({
        selling,
        buying,
        amount,
        price,
        offerId,
      });
}

/**
 * Build an unsigned Stellar DEX offer transaction.
 *
 * A "buy" of `base` is expressed as a `manageBuyOffer`; a "sell" as a
 * `manageSellOffer`. Both settle natively on the Stellar ledger's order book —
 * no custody, no intermediary.
 */
export async function buildDexOfferTx(
  params: DexOrderParams,
): Promise<Transaction> {
  const { publicKey, base, counter, side, amount, price, offerId = "0" } =
    params;

  assertValidAssetRef(base, "Base asset");
  assertValidAssetRef(counter, "Counter asset");

  if (isNative(base) && isNative(counter)) {
    throw new Error("Base and counter assets cannot both be native XLM.");
  }

  const source = await horizon.loadAccount(publicKey);
  const { selling, buying } = offerAssets(base, counter, side);

  const operation = buildOfferOperation({
    side,
    selling,
    buying,
    amount,
    price,
    offerId,
  });

  return builder(source)
    .addOperation(operation)
    .setTimeout(TIMEOUT_SECONDS)
    .build();
}

/**
 * Build an unsigned transaction that cancels a resting DEX offer.
 *
 * Stellar has no dedicated "cancel offer" operation: the DEX removes an
 * offer when the same manage-offer operation is submitted with an amount of
 * `0` ("Set to 0 if you want to delete an existing offer" in the Stellar
 * operation reference). The price is not used for a deletion, so this builder
 * sends a neutral `0` rather than an invented price, and it builds the
 * operation directly instead of re-using the "place an order" builder.
 */
export async function buildCancelOfferTx(
  publicKey: string,
  base: AssetRef,
  counter: AssetRef,
  side: OrderSide,
  offerId: string,
): Promise<Transaction> {
  assertValidAssetRef(base, "Base asset");
  assertValidAssetRef(counter, "Counter asset");

  if (isNative(base) && isNative(counter)) {
    throw new Error("Base and counter assets cannot both be native XLM.");
  }

  const source = await horizon.loadAccount(publicKey);
  const { selling, buying } = offerAssets(base, counter, side);

  const operation = buildOfferOperation({
    side,
    selling,
    buying,
    amount: CANCEL_OFFER_AMOUNT,
    price: CANCEL_OFFER_PRICE,
    offerId,
  });

  return builder(source)
    .addOperation(operation)
    .setTimeout(TIMEOUT_SECONDS)
    .build();
}
