/**
 * Tests for the Stellar Wallets Kit loader (issue #64).
 *
 * The kit modules themselves are virtual mocks — the loader is exercised
 * with respect to caching, retry/backoff and error reporting only. Module
 * state is reset between tests so the module-level `kitPromise` cache cannot
 * leak across cases.
 */

const mockKitState = { initFailures: 0, initCalls: 0 };

jest.mock(
  "@creit.tech/stellar-wallets-kit",
  () => ({
    StellarWalletsKit: {
      init: jest.fn(() => {
        mockKitState.initCalls += 1;
        if (mockKitState.initFailures > 0) {
          mockKitState.initFailures -= 1;
          throw new Error("wallet modules failed to load");
        }
      }),
    },
    Networks: { PUBLIC: "public-network", TESTNET: "testnet-network" },
  }),
  { virtual: true },
);

jest.mock(
  "@creit.tech/stellar-wallets-kit/modules/freighter",
  () => ({ FreighterModule: class FreighterModule {} }),
  { virtual: true },
);

jest.mock(
  "@creit.tech/stellar-wallets-kit/modules/xbull",
  () => ({ xBullModule: class xBullModule {} }),
  { virtual: true },
);

jest.mock(
  "@creit.tech/stellar-wallets-kit/modules/albedo",
  () => ({ AlbedoModule: class AlbedoModule {} }),
  { virtual: true },
);

let wallet: typeof import("../wallet");

beforeEach(async () => {
  mockKitState.initFailures = 0;
  mockKitState.initCalls = 0;
  jest.resetModules();
  wallet = await import("../wallet");
});

describe("getKit", () => {
  it("initializes the kit once and caches the result", async () => {
    const first = await wallet.getKit();
    const second = await wallet.getKit();

    expect(first).toBe(second);
    expect(mockKitState.initCalls).toBe(1);
  });

  it("does not cache a failed initialization and allows retrying", async () => {
    mockKitState.initFailures = 10; // more than the default attempts

    await expect(wallet.getKit()).rejects.toThrow(
      wallet.WalletInitializationError,
    );
    const callsAfterFailure = mockKitState.initCalls;
    expect(callsAfterFailure).toBe(wallet.DEFAULT_KIT_INIT_ATTEMPTS);

    // Module cache was reset on failure: the next call retries from scratch
    // and succeeds instead of surfacing the cached rejection.
    mockKitState.initFailures = 0;
    await expect(wallet.getKit()).resolves.toBeDefined();
    expect(mockKitState.initCalls).toBe(callsAfterFailure + 1);
  });

  it("reports the number of attempts and the underlying cause", async () => {
    mockKitState.initFailures = 10;

    const error = await wallet.getKit({ attempts: 2 }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(wallet.WalletInitializationError);
    const initError = error as InstanceType<typeof wallet.WalletInitializationError>;
    expect(initError.attempts).toBe(2);
    expect(initError.message).toContain("after 2 attempt(s)");
    expect(initError.message).toContain("wallet modules failed to load");
    expect(initError.cause).toBeInstanceOf(Error);
  });
});

describe("retryWithBackoff", () => {
  it("retries with doubling delays and then returns the result", async () => {
    const delays: number[] = [];
    const sleep = jest.fn((ms: number) => {
      delays.push(ms);
      return Promise.resolve();
    });
    let calls = 0;

    const result = await wallet.retryWithBackoff(
      async () => {
        calls += 1;
        if (calls < 3) throw new Error(`boom-${calls}`);
        return "ok";
      },
      { attempts: 3, baseDelayMs: 100, sleep },
    );

    expect(result).toBe("ok");
    expect(delays).toEqual([100, 200]);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("throws WalletInitializationError after the final attempt", async () => {
    const sleep = jest.fn(() => Promise.resolve());
    const cause = new Error("load failed");

    const error = await wallet
      .retryWithBackoff(
        () => Promise.reject(cause),
        { attempts: 2, baseDelayMs: 50, sleep },
      )
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(wallet.WalletInitializationError);
    const initError = error as InstanceType<typeof wallet.WalletInitializationError>;
    expect(initError.attempts).toBe(2);
    expect(initError.cause).toBe(cause);
    expect(initError.message).toContain("after 2 attempt(s)");
    // No sleep after the final attempt.
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("clamps invalid attempt and delay values", async () => {
    const sleep = jest.fn(() => Promise.resolve());

    const result = await wallet.retryWithBackoff(
      async () => "fine",
      { attempts: 0, baseDelayMs: Number.NaN, sleep },
    );

    expect(result).toBe("fine");
    expect(sleep).not.toHaveBeenCalled();
  });
});
