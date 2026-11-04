import {
  validateAssetRef,
  validatePublicKey,
} from "@/lib/stellar/asset-validation";

const VALID_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

describe("validatePublicKey", () => {
  it("accepts a well-formed G... key", () => {
    expect(validatePublicKey(VALID_ISSUER)).toBeNull();
  });

  it("rejects an empty key", () => {
    expect(validatePublicKey("")).toBe("Public key is required.");
  });

  it("rejects keys with the wrong length", () => {
    expect(validatePublicKey("GBBD47IF6LWK7P7MDE")).toMatch(
      /valid Stellar public key/,
    );
  });

  it("rejects keys with a bad prefix", () => {
    const badPrefix = `X${VALID_ISSUER.slice(1)}`;
    expect(validatePublicKey(badPrefix)).toMatch(/valid Stellar public key/);
  });

  it("rejects keys with characters outside base32", () => {
    const badChar = `${VALID_ISSUER.slice(0, -1)}1`;
    expect(validatePublicKey(badChar)).toMatch(/valid Stellar public key/);
  });
});

describe("validateAssetRef", () => {
  it("accepts a credit asset with a valid issuer", () => {
    expect(
      validateAssetRef({ code: "USDC", issuer: VALID_ISSUER }),
    ).toBeNull();
  });

  it("accepts native XLM with a null issuer", () => {
    expect(validateAssetRef({ code: "XLM", issuer: null })).toBeNull();
  });

  it("rejects an empty asset code", () => {
    expect(validateAssetRef({ code: "", issuer: null })).toBe(
      "Asset code is required.",
    );
  });

  it("rejects codes longer than 12 characters", () => {
    expect(
      validateAssetRef({ code: "TOOLONGASSETX", issuer: VALID_ISSUER }),
    ).toMatch(/1-12 alphanumeric/);
  });

  it("rejects codes with non-alphanumeric characters", () => {
    expect(
      validateAssetRef({ code: "BAD-CODE", issuer: VALID_ISSUER }),
    ).toMatch(/1-12 alphanumeric/);
  });

  it("accepts a 4-character alphanumeric code", () => {
    expect(validateAssetRef({ code: "ABCD", issuer: VALID_ISSUER })).toBeNull();
  });

  it("normalizes lowercase codes before validating", () => {
    expect(validateAssetRef({ code: "usdc", issuer: VALID_ISSUER })).toBeNull();
  });

  it("rejects a credit asset whose issuer is missing", () => {
    expect(validateAssetRef({ code: "USDC", issuer: null })).toMatch(
      /issuer is required/,
    );
  });

  it("rejects a credit asset with a malformed issuer", () => {
    expect(
      validateAssetRef({ code: "USDC", issuer: "not-a-key" }),
    ).toMatch(/valid Stellar public key/);
  });
});
