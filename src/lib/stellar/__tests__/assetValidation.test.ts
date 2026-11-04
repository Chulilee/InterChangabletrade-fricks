import {
  InvalidAssetError,
  assertValidAssetRef,
  isValidAssetCode,
  isValidAssetIssuer,
  type AssetRefLike,
} from "@/lib/stellar/assetValidation";
import { buildDexOfferTx, buildTrustlineTx } from "@/lib/stellar/dex";
import { toSdkAsset } from "@/lib/stellar/horizon";

const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const XLM = { code: "XLM", issuer: null } as const;

function errorMessage(fn: () => void): string {
  try {
    fn();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error("Expected the function to throw");
}

describe("isValidAssetCode", () => {
  it("accepts 1-12 alphanumeric characters", () => {
    expect(isValidAssetCode("A")).toBe(true);
    expect(isValidAssetCode("USDC")).toBe(true);
    expect(isValidAssetCode("GOLD12345678")).toBe(true);
  });

  it("rejects empty, overlong, and non-alphanumeric codes", () => {
    expect(isValidAssetCode("")).toBe(false);
    expect(isValidAssetCode("ABCDEFGHIJKLM")).toBe(false);
    expect(isValidAssetCode("USD-C")).toBe(false);
    expect(isValidAssetCode("USD C")).toBe(false);
    expect(isValidAssetCode("USDC!")).toBe(false);
    expect(isValidAssetCode(undefined)).toBe(false);
  });
});

describe("isValidAssetIssuer", () => {
  it("accepts a Stellar account ID", () => {
    expect(isValidAssetIssuer(ISSUER)).toBe(true);
  });

  it("rejects non-account and malformed values", () => {
    expect(isValidAssetIssuer("")).toBe(false);
    expect(isValidAssetIssuer("not-an-account")).toBe(false);
    expect(isValidAssetIssuer(ISSUER.toLowerCase())).toBe(false);
    expect(isValidAssetIssuer(`${ISSUER.slice(0, -1)}X`)).toBe(false);
  });
});

describe("assertValidAssetRef", () => {
  it("accepts native XLM without an issuer", () => {
    expect(() => assertValidAssetRef(XLM)).not.toThrow();
    expect(() => assertValidAssetRef({ code: "xlm", issuer: null })).not.toThrow();
  });

  it("accepts a credit asset with a valid issuer", () => {
    expect(() =>
      assertValidAssetRef({ code: "USDC", issuer: ISSUER }),
    ).not.toThrow();
  });

  it("rejects a missing code with a descriptive message", () => {
    const message = errorMessage(() =>
      assertValidAssetRef({} as unknown as AssetRefLike, "Base asset"),
    );

    expect(message).toContain("Base asset code is missing");
    expect(message).toContain("1-12 alphanumeric characters");
  });

  it("rejects an invalid code with a descriptive message", () => {
    const message = errorMessage(() =>
      assertValidAssetRef({ code: "USDC/USD", issuer: ISSUER }, "Base asset"),
    );

    expect(message).toContain('Base asset code "USDC/USD" is invalid');
  });

  it("rejects native XLM that carries an issuer", () => {
    const message = errorMessage(() =>
      assertValidAssetRef({ code: "XLM", issuer: ISSUER }, "Counter asset"),
    );

    expect(message).toContain("Counter asset issuer must be null for native XLM");
  });

  it("requires an issuer for a credit asset", () => {
    const message = errorMessage(() =>
      assertValidAssetRef({ code: "USDC", issuer: null }, "Base asset"),
    );

    expect(message).toContain("Base asset issuer is required");
    expect(message).toContain("USDC");
  });

  it("rejects an invalid issuer", () => {
    const message = errorMessage(() =>
      assertValidAssetRef(
        { code: "USDC", issuer: "not-a-stellar-account" },
        "Base asset",
      ),
    );

    expect(message).toContain("Base asset issuer");
    expect(message).toContain("not a valid Stellar account ID");
  });
});

describe("toSdkAsset", () => {
  it("maps native XLM", () => {
    expect(toSdkAsset(XLM).isNative()).toBe(true);
  });

  it("maps a valid credit asset", () => {
    const asset = toSdkAsset({ code: "USDC", issuer: ISSUER });

    expect(asset.isNative()).toBe(false);
    expect(asset.getCode()).toBe("USDC");
    expect(asset.getIssuer()).toBe(ISSUER);
  });

  it("rejects an invalid asset before constructing an SDK asset", () => {
    expect(() =>
      toSdkAsset({ code: "USDC", issuer: null }),
    ).toThrow(InvalidAssetError);
  });
});

describe("DEX transaction builders", () => {
  it("rejects an invalid base asset before loading the account", async () => {
    await expect(
      buildDexOfferTx({
        publicKey: ISSUER,
        base: { code: "USDC/USD", issuer: ISSUER },
        counter: XLM,
        side: "buy",
        amount: "1",
        price: "1",
      }),
    ).rejects.toBeInstanceOf(InvalidAssetError);
  });

  it("names the counter asset when its issuer is invalid", async () => {
    await expect(
      buildDexOfferTx({
        publicKey: ISSUER,
        base: XLM,
        counter: { code: "USDC", issuer: "invalid" },
        side: "sell",
        amount: "1",
        price: "1",
      }),
    ).rejects.toThrow(/Counter asset issuer/);
  });

  it("rejects an invalid trustline asset before loading the account", async () => {
    await expect(
      buildTrustlineTx(ISSUER, { code: "USDC", issuer: null }),
    ).rejects.toBeInstanceOf(InvalidAssetError);
  });
});
