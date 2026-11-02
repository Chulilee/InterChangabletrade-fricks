import {
  configureAssetService,
  getAsset,
  getAssetServiceConfig,
  getHoldings,
  listAssets,
  resetAssetServiceConfig,
  simulateAssetServiceFailure,
} from "../assetService";
import { MOCK_ASSETS } from "../mockData";

describe("assetService mock configuration", () => {
  beforeEach(() => {
    resetAssetServiceConfig();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("defaults to a 200ms delay with failures disabled", () => {
    const config = getAssetServiceConfig();

    expect(config.latencyMs).toBe(200);
    expect(config.errorRate).toBe(0);
    expect(config.errorFactory).toEqual(expect.any(Function));
    expect(config.random).toEqual(expect.any(Function));
  });

  it("applies the configured latency to every request", async () => {
    const timeout = jest.spyOn(globalThis, "setTimeout");
    configureAssetService({ latencyMs: 25 });

    await listAssets();

    expect(timeout).toHaveBeenCalledWith(expect.any(Function), 25);
  });

  it("skips the timer when latency is zero", async () => {
    const timeout = jest.spyOn(globalThis, "setTimeout");
    configureAssetService({ latencyMs: 0 });

    await listAssets();

    expect(timeout).not.toHaveBeenCalled();
  });

  it("returns the seeded catalogue and holdings", async () => {
    configureAssetService({ latencyMs: 0 });

    await expect(listAssets()).resolves.toEqual(MOCK_ASSETS);
    await expect(getAsset("usdc")).resolves.toEqual(MOCK_ASSETS[0]);
    await expect(getAsset("does-not-exist")).resolves.toBeNull();

    const holdings = await getHoldings();
    expect(holdings).toHaveLength(3);
    expect(holdings[0].asset.id).toBe(MOCK_ASSETS[0].id);
  });

  it("rejects once for a queued failure and then recovers", async () => {
    configureAssetService({ latencyMs: 0 });
    simulateAssetServiceFailure("catalogue is unavailable");

    await expect(listAssets()).rejects.toThrow("catalogue is unavailable");
    await expect(listAssets()).resolves.toEqual(MOCK_ASSETS);
  });

  it("accepts an Error instance for a queued failure", async () => {
    configureAssetService({ latencyMs: 0 });
    const failure = new Error("upstream exploded");
    simulateAssetServiceFailure(failure);

    await expect(getHoldings()).rejects.toBe(failure);
  });

  it("uses the error factory when errorRate is 1", async () => {
    const failure = new Error("simulated outage");
    configureAssetService({
      latencyMs: 0,
      errorRate: 1,
      errorFactory: () => failure,
      random: () => 0.5,
    });

    await expect(getAsset("usdc")).rejects.toBe(failure);
  });

  it("never fails when errorRate is 0, even if random returns 0", async () => {
    configureAssetService({
      latencyMs: 0,
      errorRate: 0,
      random: () => 0,
    });

    await expect(listAssets()).resolves.toEqual(MOCK_ASSETS);
  });

  it("rejects an invalid latency", () => {
    expect(() => configureAssetService({ latencyMs: -1 })).toThrow(RangeError);
    expect(() => configureAssetService({ latencyMs: Number.NaN })).toThrow(
      RangeError,
    );
  });

  it("rejects an invalid error rate", () => {
    expect(() => configureAssetService({ errorRate: -0.1 })).toThrow(RangeError);
    expect(() => configureAssetService({ errorRate: 1.1 })).toThrow(RangeError);
    expect(() => configureAssetService({ errorRate: Number.NaN })).toThrow(
      RangeError,
    );
  });

  it("restores defaults and clears queued failures", async () => {
    configureAssetService({ latencyMs: 0, errorRate: 1 });
    simulateAssetServiceFailure("queued failure");

    resetAssetServiceConfig();

    const config = getAssetServiceConfig();
    expect(config.latencyMs).toBe(200);
    expect(config.errorRate).toBe(0);
    await expect(listAssets()).resolves.toEqual(MOCK_ASSETS);
  });
});
