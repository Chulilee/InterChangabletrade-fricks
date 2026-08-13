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
 * Build an unsigned Stellar DEX offer transaction.
 *
 * A "buy" of `base` is expressed as a `manageBuyOffer`; a "sell" as a
 * `manageSellOffer`. Both settle natively on the Stellar ledger's order book —
 * no custody, no intermediary.
 */
export async function buildDexOfferTx(params: DexOrderParams): Promise<Transaction> {
  const { publicKey, base, counter, side, amount, price, offerId = "0" } = params;

  if (isNative(base) && isNative(counter)) {
    throw new Error("Base and counter assets cannot both be native XLM.");
  }

  const source = await horizon.loadAccount(publicKey);
  const selling = side === "sell" ? toSdkAsset(base) : toSdkAsset(counter);
  const buying = side === "sell" ? toSdkAsset(counter) : toSdkAsset(base);

  const operation =
    side === "buy"
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

  return builder(source).addOperation(operation).setTimeout(TIMEOUT_SECONDS).build();
}

/** Cancel a resting offer by setting its amount to zero. */
export async function buildCancelOfferTx(
  publicKey: string,
  base: AssetRef,
  counter: AssetRef,
  side: OrderSide,
  offerId: string,
): Promise<Transaction> {
  return buildDexOfferTx({
    publicKey,
    base,
    counter,
    side,
    amount: "0",
    price: "1",
    offerId,
  });
}
