import {
  isCreditBalanceEntry,
  isNativeBalanceEntry,
  isSupportedBalanceEntry,
  toBalance,
  toBalances,
  type HorizonBalanceEntry,
} from "@/lib/stellar/balances";

const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

function native(balance = "100.5000000"): HorizonBalanceEntry {
  return { asset_type: "native", balance };
}

function trustline(
  assetType: "credit_alphanum4" | "credit_alphanum12",
  balance = "5.0000000",
): HorizonBalanceEntry {
  return {
    asset_type: assetType,
    asset_code: "USD",
    asset_issuer: ISSUER,
    balance,
  };
}

/**
 * A liquidity pool position: a real Horizon entry with no asset code or issuer.
 *
 * Deliberately not annotated as `HorizonBalanceEntry`. That interface
 * describes only the fields the parser reads, and a liquidity pool entry has a
 * field of its own that the parser must never reach for, so the fixture keeps
 * its own inferred shape and is only assignable to it at the call site.
 */
function liquidityPool(balance = "1234.5678901") {
  return {
    asset_type: "liquidity_pool",
    liquidity_pool_id:
      "dd7b1ab831c2733309e6df255ce91a758c1c8c62d3304d5e9f6f24e4b2f1f2e",
    balance,
  };
}

/** An asset type this build has never heard of. */
function futureAssetType(): HorizonBalanceEntry {
  return {
    asset_type: "credit_alphanum64",
    asset_code: "SOMETHINGNEW",
    asset_issuer: ISSUER,
    balance: "7.0000000",
  };
}

describe("asset type guards", () => {
  it("recognises the native balance", () => {
    expect(isNativeBalanceEntry(native())).toBe(true);
    expect(isNativeBalanceEntry(trustline("credit_alphanum4"))).toBe(false);
    expect(isNativeBalanceEntry(liquidityPool())).toBe(false);
  });

  it("recognises both trustline asset types", () => {
    expect(isCreditBalanceEntry(trustline("credit_alphanum4"))).toBe(true);
    expect(isCreditBalanceEntry(trustline("credit_alphanum12"))).toBe(true);
    expect(isCreditBalanceEntry(native())).toBe(false);
    expect(isCreditBalanceEntry(liquidityPool())).toBe(false);
  });

  it("treats an unknown asset type as unsupported", () => {
    expect(isSupportedBalanceEntry(native())).toBe(true);
    expect(isSupportedBalanceEntry(trustline("credit_alphanum4"))).toBe(true);
    expect(isSupportedBalanceEntry(trustline("credit_alphanum12"))).toBe(true);
    expect(isSupportedBalanceEntry(liquidityPool())).toBe(false);
    expect(isSupportedBalanceEntry(futureAssetType())).toBe(false);
  });
});

describe("toBalance", () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it("maps the native balance to XLM with a null issuer", () => {
    expect(toBalance(native("100.5000000"))).toEqual({
      code: "XLM",
      issuer: null,
      balance: "100.5000000",
    });
  });

  it("maps a credit_alphanum4 trustline", () => {
    expect(toBalance(trustline("credit_alphanum4", "5.0000000"))).toEqual({
      code: "USD",
      issuer: ISSUER,
      balance: "5.0000000",
    });
  });

  it("maps a credit_alphanum12 trustline", () => {
    expect(toBalance(trustline("credit_alphanum12", "9.2500000"))).toEqual({
      code: "USD",
      issuer: ISSUER,
      balance: "9.2500000",
    });
  });

  it("skips a liquidity pool entry rather than emitting an undefined code", () => {
    expect(toBalance(liquidityPool())).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("skips an asset type it does not know about", () => {
    expect(toBalance(futureAssetType())).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("logs the offending asset type so an unexpected entry is visible", () => {
    toBalance(liquidityPool());

    const [message] = warn.mock.calls[0];
    expect(message).toContain("liquidity_pool");
  });

  it("skips a trustline entry that has no asset code", () => {
    const entry: HorizonBalanceEntry = {
      asset_type: "credit_alphanum4",
      asset_issuer: ISSUER,
      balance: "1.0000000",
    };

    expect(toBalance(entry)).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("skips a trustline entry that has no issuer", () => {
    const entry: HorizonBalanceEntry = {
      asset_type: "credit_alphanum4",
      asset_code: "USD",
      balance: "1.0000000",
    };

    expect(toBalance(entry)).toBeNull();
  });

  it("does not throw on any unexpected entry shape", () => {
    expect(() => toBalance({ asset_type: "", balance: "0" })).not.toThrow();
    expect(toBalance({ asset_type: "", balance: "0" })).toBeNull();
  });
});

describe("toBalances", () => {
  beforeEach(() => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("parses a normal account", () => {
    expect(toBalances([native(), trustline("credit_alphanum4")])).toEqual([
      { code: "XLM", issuer: null, balance: "100.5000000" },
      { code: "USD", issuer: ISSUER, balance: "5.0000000" },
    ]);
  });

  it("keeps every usable balance when one entry is unusable", () => {
    const balances = toBalances([
      native(),
      liquidityPool(),
      trustline("credit_alphanum12", "3.0000000"),
      futureAssetType(),
    ]);

    expect(balances).toEqual([
      { code: "XLM", issuer: null, balance: "100.5000000" },
      { code: "USD", issuer: ISSUER, balance: "3.0000000" },
    ]);
  });

  it("returns an empty list when nothing is usable", () => {
    expect(toBalances([liquidityPool(), futureAssetType()])).toEqual([]);
  });

  it("handles an account with no balances", () => {
    expect(toBalances([])).toEqual([]);
  });

  it("preserves Horizon ordering", () => {
    const balances = toBalances([
      trustline("credit_alphanum4", "1.0000000"),
      native("2.0000000"),
      trustline("credit_alphanum12", "3.0000000"),
    ]);

    expect(balances.map((b) => b.code)).toEqual(["USD", "XLM", "USD"]);
  });
});