import type { Asset, Holding } from "@/types/asset";
import { MOCK_ASSETS } from "./mockData";

/**
 * Read-only catalogue/portfolio service. Backed by seed data today; the async
 * signatures mirror the eventual InterChangableTrade-Core REST client so callers
 * do not change when the real transport is wired in.
 *
 * On-chain actions (wallet connect, order placement, settlement) do NOT live
 * here — they run against Stellar via `@/services/tradeService` and
 * `@/lib/stellar/*`, which are browser-only.
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
