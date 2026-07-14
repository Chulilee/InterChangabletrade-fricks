import type { Asset, Holding, TradeOrder } from "@/types/asset";
import { MOCK_ASSETS } from "./mockData";

/**
 * Asset service. Currently backed by in-memory mock data; the async signatures
 * mirror the eventual InterChangableTrade-Core REST client so callers do not
 * change when the real transport is wired in.
 */

const LATENCY_MS = 200;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

export async function listAssets(): Promise<Asset[]> {
  return delay(MOCK_ASSETS);
}

export async function getAsset(id: string): Promise<Asset | null> {
  const asset = MOCK_ASSETS.find((a) => a.id === id) ?? null;
  return delay(asset);
}

export async function getHoldings(): Promise<Holding[]> {
  const holdings: Holding[] = [
    { asset: MOCK_ASSETS[0], balance: 5_240.5 },
    { asset: MOCK_ASSETS[1], balance: 3.75 },
    { asset: MOCK_ASSETS[2], balance: 42 },
  ];
  return delay(holdings);
}

export async function submitOrder(order: TradeOrder): Promise<{ id: string }> {
  // TODO: sign with the connected wallet and submit to Soroban.
  return delay({ id: `order_${order.assetId}_${order.side}` });
}
