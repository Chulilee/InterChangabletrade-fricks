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
 *
 * The mock transport is configurable so tests (and local development) can
 * exercise loading and failure states without patching the module itself.
 */

export interface AssetServiceMockConfig {
  /** Artificial latency applied to every call, in milliseconds. */
  latencyMs: number;
  /** Probability (0–1) that a call rejects with `errorFactory()`. */
  errorRate: number;
  /** Error thrown when a simulated failure occurs. */
  errorFactory: () => Error;
  /** Random source used for `errorRate`; injectable for deterministic tests. */
  random: () => number;
}

export type AssetServiceMockOptions = Partial<AssetServiceMockConfig>;

const DEFAULT_CONFIG: AssetServiceMockConfig = {
  latencyMs: 200,
  errorRate: 0,
  errorFactory: () => new Error("Simulated asset service failure"),
  random: Math.random,
};

let config: AssetServiceMockConfig = { ...DEFAULT_CONFIG };
const queuedFailures: Error[] = [];

/** Current mock configuration. The returned object is a copy. */
export function getAssetServiceConfig(): AssetServiceMockConfig {
  return { ...config };
}

/**
 * Override mock behaviour for the current process. Commonly used by tests to
 * remove the artificial delay and to force failures.
 */
export function configureAssetService(
  options: AssetServiceMockOptions,
): AssetServiceMockConfig {
  if (
    options.latencyMs !== undefined &&
    (!Number.isFinite(options.latencyMs) || options.latencyMs < 0)
  ) {
    throw new RangeError(
      "latencyMs must be a finite number greater than or equal to 0.",
    );
  }

  if (
    options.errorRate !== undefined &&
    (!Number.isFinite(options.errorRate) ||
      options.errorRate < 0 ||
      options.errorRate > 1)
  ) {
    throw new RangeError("errorRate must be a number between 0 and 1.");
  }

  config = { ...config, ...options };
  return getAssetServiceConfig();
}

/** Restore the default latency, error rate, and clear queued failures. */
export function resetAssetServiceConfig(): void {
  config = { ...DEFAULT_CONFIG };
  queuedFailures.length = 0;
}

/**
 * Queue a one-shot failure for the next asset request. Deterministic
 * alternative to `errorRate` for tests that do not want to inject `random`.
 */
export function simulateAssetServiceFailure(error?: Error | string): void {
  const failure =
    typeof error === "string" ? new Error(error) : (error ?? config.errorFactory());
  queuedFailures.push(failure);
}

function takeFailure(): Error | null {
  const queued = queuedFailures.shift();
  if (queued) {
    return queued;
  }

  if (config.errorRate > 0 && config.random() < config.errorRate) {
    return config.errorFactory();
  }

  return null;
}

async function respond<T>(value: T): Promise<T> {
  const failure = takeFailure();

  if (config.latencyMs > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, config.latencyMs));
  }

  if (failure) {
    throw failure;
  }

  return value;
}

export async function listAssets(): Promise<Asset[]> {
  return respond(MOCK_ASSETS);
}

export async function getAsset(id: string): Promise<Asset | null> {
  const asset = MOCK_ASSETS.find((a) => a.id === id) ?? null;
  return respond(asset);
}

export async function getHoldings(): Promise<Holding[]> {
  const holdings: Holding[] = [
    { asset: MOCK_ASSETS[0], balance: 5_240.5 },
    { asset: MOCK_ASSETS[1], balance: 3.75 },
    { asset: MOCK_ASSETS[2], balance: 42 },
  ];
  return respond(holdings);
}
