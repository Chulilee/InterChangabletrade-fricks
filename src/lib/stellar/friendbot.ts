/**
 * Friendbot is the Stellar Testnet faucet. It reports failures in several
 * shapes — Horizon problem+json, legacy plain-text errors, and occasionally an
 * HTML page from an intermediary proxy — so every response is normalised here
 * into a structured `FriendbotError` with user-facing guidance.
 */

export type FriendbotErrorCode =
  | "invalid_address"
  | "rate_limited"
  | "server_error"
  | "network_error"
  | "unsupported_network"
  | "op_low_reserve"
  | "op_underfunded"
  | "op_malformed"
  | "op_no_source_account"
  | "op_src_no_trust"
  | "op_no_trust"
  | "op_line_full"
  | "op_not_authorized"
  | "op_not_supported"
  | "tx_failed"
  | "tx_bad_seq"
  | "tx_bad_auth"
  | "tx_insufficient_balance"
  | "tx_no_source_account"
  | "tx_insufficient_fee"
  | "tx_too_early"
  | "tx_too_late"
  | "tx_missing_operation"
  | "tx_internal_error"
  | "unknown";

interface Guidance {
  message: string;
  retryable: boolean;
}

/**
 * Every Friendbot / Stellar result code this client can receive, mapped to a
 * message that tells the user what to do next.
 */
const GUIDANCE: Record<Exclude<FriendbotErrorCode, "unknown">, Guidance> = {
  invalid_address: {
    message:
      "Friendbot rejected the address. Make sure it is a valid Stellar Testnet public key (starts with G) and try again.",
    retryable: false,
  },
  rate_limited: {
    message: "Friendbot is rate limiting requests. Wait a minute and try again.",
    retryable: true,
  },
  server_error: {
    message: "Friendbot is temporarily unavailable. Try again in a moment.",
    retryable: true,
  },
  network_error: {
    message:
      "Could not reach Friendbot. Check your internet connection and try again.",
    retryable: true,
  },
  unsupported_network: {
    message: "Friendbot funding is only available on Testnet.",
    retryable: false,
  },
  op_low_reserve: {
    message:
      "Friendbot could not create the account because it would fall below Stellar's minimum XLM reserve. Fund it from another wallet instead.",
    retryable: false,
  },
  op_underfunded: {
    message:
      "Friendbot's funding account is low on XLM. Try again later or use another faucet.",
    retryable: true,
  },
  op_malformed: {
    message:
      "Friendbot could not build the funding transaction. Check the Stellar address and try again.",
    retryable: false,
  },
  op_no_source_account: {
    message: "Friendbot's source account is unavailable. Try again later.",
    retryable: true,
  },
  op_src_no_trust: {
    message:
      "Friendbot's source account is missing a required trustline. Try again later.",
    retryable: true,
  },
  op_no_trust: {
    message:
      "The destination account is missing a trustline required for funding.",
    retryable: false,
  },
  op_line_full: {
    message:
      "The destination account's trustline is full, so Friendbot could not fund it.",
    retryable: false,
  },
  op_not_authorized: {
    message: "The destination account is not authorised to receive this asset.",
    retryable: false,
  },
  op_not_supported: {
    message:
      "Friendbot does not support this operation. Use a standard Stellar account address.",
    retryable: false,
  },
  tx_failed: {
    message: "Friendbot's funding transaction failed. Try again in a moment.",
    retryable: true,
  },
  tx_bad_seq: {
    message:
      "Friendbot hit a sequence-number conflict. Try again in a moment.",
    retryable: true,
  },
  tx_bad_auth: {
    message:
      "Friendbot could not authorise the funding transaction. Try again later.",
    retryable: false,
  },
  tx_insufficient_balance: {
    message:
      "Friendbot's funding account does not have enough XLM. Try again later.",
    retryable: true,
  },
  tx_no_source_account: {
    message: "Friendbot's source account is unavailable. Try again later.",
    retryable: true,
  },
  tx_insufficient_fee: {
    message:
      "Friendbot's transaction fee was too low. Try again in a moment.",
    retryable: true,
  },
  tx_too_early: {
    message: "Friendbot's transaction is not valid yet. Try again in a moment.",
    retryable: true,
  },
  tx_too_late: {
    message:
      "Friendbot's transaction expired before it was submitted. Try again.",
    retryable: true,
  },
  tx_missing_operation: {
    message:
      "Friendbot sent a transaction with no operations. Try again later.",
    retryable: false,
  },
  tx_internal_error: {
    message: "Friendbot hit an internal error. Try again later.",
    retryable: true,
  },
};

export interface FriendbotErrorInit {
  code: FriendbotErrorCode;
  status?: number | null;
  detail?: string;
  friendbotCode?: string | null;
}

export class FriendbotError extends Error {
  /** Normalised failure reason. */
  readonly code: FriendbotErrorCode;
  /** HTTP status, or null when the request never reached Friendbot. */
  readonly status: number | null;
  /** Raw detail reported by Friendbot (safe to log, not necessarily user-facing). */
  readonly detail: string;
  /** True when retrying the same request may succeed. */
  readonly retryable: boolean;
  /** The Stellar result code reported by Friendbot, when there is one. */
  readonly friendbotCode: string | null;

  constructor(init: FriendbotErrorInit) {
    const status = init.status ?? null;
    const detail = init.detail ?? "";
    super(messageFor(init.code, status, detail));
    Object.setPrototypeOf(this, FriendbotError.prototype);
    this.name = "FriendbotError";
    this.code = init.code;
    this.status = status;
    this.detail = detail;
    this.retryable = guidanceFor(init.code)?.retryable ?? false;
    this.friendbotCode = init.friendbotCode ?? null;
  }
}

export interface FriendbotFundOptions {
  /** Friendbot endpoint, or null when the active network has no faucet. */
  friendbotUrl: string | null;
  /** Injectable fetch implementation, primarily for tests. */
  fetchImpl?: typeof fetch;
}

/**
 * Fund an account through Friendbot.
 *
 * Funding is idempotent: Friendbot returns 400 when the account already exists
 * or already holds the starting balance, and both are treated as success.
 */
export async function fundAccountWithFriendbot(
  publicKey: string,
  { friendbotUrl, fetchImpl }: FriendbotFundOptions,
): Promise<void> {
  if (!friendbotUrl) {
    throw new FriendbotError({ code: "unsupported_network" });
  }

  const doFetch = fetchImpl ?? globalThis.fetch;
  if (!doFetch) {
    throw new FriendbotError({
      code: "network_error",
      detail: "fetch is not available in this environment",
    });
  }

  const url = new URL(friendbotUrl);
  url.searchParams.set("addr", publicKey);

  let response: Response;
  try {
    response = await doFetch(url.toString(), { method: "GET" });
  } catch (error) {
    throw new FriendbotError({
      code: "network_error",
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  if (response.ok) {
    return;
  }

  const body = await response.text().catch(() => "");
  const payload = parseJson(body);
  if (isAlreadyFunded(payload, body)) {
    return;
  }
  throw parseFriendbotError(response.status, payload, body);
}

function guidanceFor(code: FriendbotErrorCode): Guidance | null {
  return code === "unknown" ? null : GUIDANCE[code];
}

function messageFor(
  code: FriendbotErrorCode,
  status: number | null,
  detail: string,
): string {
  const guidance = guidanceFor(code);
  if (guidance) {
    return guidance.message;
  }

  const statusPart = status === null ? "" : ` (${status})`;
  const detailPart = detail ? `: ${detail}` : ".";
  return `Friendbot funding failed${statusPart}${detailPart}`;
}

/**
 * Friendbot reports "already funded" in a few different ways depending on
 * which version is deployed. Prefer the structured result codes and problem
 * detail, then fall back to the legacy plain-text format.
 */
function isAlreadyFunded(payload: unknown, body: string): boolean {
  const codes = extractResultCodes(payload);
  if (codes.includes("op_already_exists")) {
    return true;
  }

  if (isRecord(payload)) {
    const extras = isRecord(payload.extras) ? payload.extras : null;
    const message = [
      extras ? readString(extras.reason) : null,
      readString(payload.detail),
      readString(payload.message),
      readString(payload.error),
      readString(payload.title),
    ]
      .filter((value): value is string => value !== null)
      .join(" ")
      .toLowerCase();

    if (
      message.includes("already funded") ||
      message.includes("account already exists") ||
      message.includes("createaccountalreadyexist")
    ) {
      return true;
    }
  }

  // Older Friendbot deployments return plain text rather than problem+json.
  const text = body.toLowerCase();
  return (
    text.includes("op_already_exists") ||
    text.includes("createaccountalreadyexist") ||
    text.includes("account already funded") ||
    text.includes("already funded to starting balance") ||
    text.includes("account already exists")
  );
}

function parseJson(body: string): unknown {
  if (!body.trim()) {
    return null;
  }
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Collect Stellar result codes. Operation codes come first so a specific
 * `op_low_reserve` wins over the generic `tx_failed` transaction code.
 */
function extractResultCodes(payload: unknown): string[] {
  if (!isRecord(payload)) {
    return [];
  }

  const extras = isRecord(payload.extras) ? payload.extras : null;
  const resultCodes =
    extras && isRecord(extras.result_codes) ? extras.result_codes : null;
  const codes: string[] = [];

  if (resultCodes) {
    const operations = resultCodes.operations;
    if (Array.isArray(operations)) {
      for (const operation of operations) {
        if (typeof operation === "string") {
          codes.push(operation);
        }
      }
    }

    const transaction = resultCodes.transaction;
    if (typeof transaction === "string") {
      codes.push(transaction);
    }
  }

  const direct = payload.code ?? payload.error_code;
  if (typeof direct === "string") {
    codes.push(direct);
  }

  return codes;
}

function extractDetail(payload: unknown, body: string): string {
  if (isRecord(payload)) {
    const extras = isRecord(payload.extras) ? payload.extras : null;
    const candidates = [
      extras ? readString(extras.reason) : null,
      readString(payload.detail),
      readString(payload.message),
      readString(payload.error),
      readString(payload.title),
    ];
    const found = candidates.find((value): value is string => value !== null);
    if (found) {
      return found;
    }
  }

  return body
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

function isInvalidAddress(payload: unknown, detail: string): boolean {
  if (isRecord(payload)) {
    const type = readString(payload.type)?.toLowerCase() ?? "";
    if (type.includes("invalid_field")) {
      return true;
    }

    const extras = isRecord(payload.extras) ? payload.extras : null;
    if (extras && readString(extras.invalid_field) === "addr") {
      return true;
    }
  }

  const text = detail.toLowerCase();
  return (
    text.includes("invalid address") ||
    text.includes("invalid field") ||
    text.includes("must be a valid g") ||
    text.includes("not a valid")
  );
}

function parseFriendbotError(
  status: number,
  payload: unknown,
  body: string,
): FriendbotError {
  const detail = extractDetail(payload, body);
  const codes = extractResultCodes(payload);

  let code: FriendbotErrorCode;
  if (status === 429) {
    code = "rate_limited";
  } else if (status >= 500) {
    code = "server_error";
  } else {
    const known = codes.find((candidate) =>
      Object.prototype.hasOwnProperty.call(GUIDANCE, candidate),
    ) as Exclude<FriendbotErrorCode, "unknown"> | undefined;

    if (known) {
      code = known;
    } else if (isInvalidAddress(payload, detail)) {
      code = "invalid_address";
    } else {
      code = "unknown";
    }
  }

  return new FriendbotError({
    code,
    status,
    detail,
    friendbotCode: codes[0] ?? null,
  });
}
