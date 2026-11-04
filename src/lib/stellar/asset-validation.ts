import type { AssetRef } from "./horizon";

/** Stellar account public key: "G" followed by 55 base32 characters. */
const PUBLIC_KEY_RE = /^G[A-Z2-7]{55}$/;

/** Asset codes are 1-12 alphanumeric characters (uppercase after normalization). */
const ASSET_CODE_RE = /^[A-Z0-9]{1,12}$/;

/**
 * Validate a public key received from a browser form before it reaches the
 * SDK or Horizon. Returns the error message when the key is unusable, `null`
 * when it is well formed.
 */
export function validatePublicKey(publicKey: string): string | null {
  if (typeof publicKey !== "string" || publicKey.length === 0) {
    return "Public key is required.";
  }

  if (!PUBLIC_KEY_RE.test(publicKey)) {
    return "Issuer must be a valid Stellar public key (56 characters starting with G).";
  }

  return null;
}

/**
 * Validate an asset reference used to build a DEX offer. Native XLM (null
 * issuer, code "XLM") is accepted as-is; every other reference must carry a
 * 1-12 character alphanumeric code and a valid issuer public key.
 *
 * Returns the error message when the asset is unusable, `null` when valid.
 */
export function validateAssetRef(ref: AssetRef): string | null {
  const code = typeof ref.code === "string" ? ref.code.trim().toUpperCase() : "";

  if (!code) {
    return "Asset code is required.";
  }

  if (code === "XLM" && !ref.issuer) {
    return null;
  }

  if (!ASSET_CODE_RE.test(code)) {
    return "Asset code must be 1-12 alphanumeric characters.";
  }

  if (!ref.issuer) {
    return "Asset issuer is required for non-native assets.";
  }

  return validatePublicKey(ref.issuer);
}
