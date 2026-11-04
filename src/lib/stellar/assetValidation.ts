import { StrKey } from "@stellar/stellar-sdk";

/**
 * The fields needed to validate a Stellar asset reference.
 *
 * Kept structural so this module does not depend on the Horizon client module
 * (which imports the validator for its `toSdkAsset` helper).
 */
export interface AssetRefLike {
  code: string;
  issuer?: string | null;
}

export type AssetField = "code" | "issuer";

/** Raised when an asset reference cannot be represented on the Stellar network. */
export class InvalidAssetError extends Error {
  readonly label: string;
  readonly field: AssetField;

  constructor(label: string, field: AssetField, detail: string) {
    super(`${label} ${field} ${detail}`);
    this.name = "InvalidAssetError";
    this.label = label;
    this.field = field;
    Object.setPrototypeOf(this, InvalidAssetError.prototype);
  }
}

/** Stellar asset codes are 1-12 alphanumeric characters. */
const ASSET_CODE_PATTERN = /^[A-Za-z0-9]{1,12}$/;

export function isValidAssetCode(code: unknown): code is string {
  return typeof code === "string" && ASSET_CODE_PATTERN.test(code);
}

/** Issuers are Stellar account IDs (`G...`), not contract IDs (`C...`). */
export function isValidAssetIssuer(issuer: unknown): issuer is string {
  return typeof issuer === "string" && StrKey.isValidEd25519PublicKey(issuer);
}

/**
 * Validate an asset reference before it reaches the Stellar SDK or Horizon.
 *
 * The SDK performs its own checks, but its errors do not identify which side of
 * an order is wrong. Validating here gives callers an actionable message and
 * lets us fail before making a network request.
 *
 * Native XLM is represented by `{ code: "XLM", issuer: null }`. A credit asset
 * needs an alphanumeric code and a valid `G...` issuer.
 */
export function assertValidAssetRef(
  ref: AssetRefLike,
  label = "Asset",
): void {
  if (!ref || !isValidAssetCode(ref.code)) {
    const detail =
      ref && typeof ref.code === "string"
        ? `"${ref.code}" is invalid`
        : "is missing";
    throw new InvalidAssetError(
      label,
      "code",
      `${detail}; use 1-12 alphanumeric characters.`,
    );
  }

  const isNative = ref.code.toUpperCase() === "XLM";

  if (isNative) {
    if (ref.issuer) {
      throw new InvalidAssetError(
        label,
        "issuer",
        "must be null for native XLM.",
      );
    }
    return;
  }

  if (!ref.issuer) {
    throw new InvalidAssetError(
      label,
      "issuer",
      `is required for the ${ref.code} asset.`,
    );
  }

  if (!isValidAssetIssuer(ref.issuer)) {
    throw new InvalidAssetError(
      label,
      "issuer",
      `"${ref.issuer}" is not a valid Stellar account ID (G...).`,
    );
  }
}
