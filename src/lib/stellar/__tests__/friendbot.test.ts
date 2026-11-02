import {
  FriendbotError,
  fundAccountWithFriendbot,
} from "@/lib/stellar/friendbot";

const ADDRESS = "GDJIN6W6PLTPKLLM57UW65ZH4BITUXUMYQHIMAZFYXF45PZVAWDBI77Z";

function mockResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: jest
      .fn()
      .mockResolvedValue(typeof body === "string" ? body : JSON.stringify(body)),
  } as unknown as Response;
}

function fetchReturning(status: number, body: unknown): jest.Mock {
  return jest.fn().mockResolvedValue(mockResponse(status, body));
}

async function captureError(promise: Promise<unknown>): Promise<FriendbotError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof FriendbotError) {
      return error;
    }
    throw error;
  }

  throw new Error("Expected fundAccountWithFriendbot to reject");
}

describe("fundAccountWithFriendbot", () => {
  it("requests the configured Friendbot endpoint with the encoded address", async () => {
    const fetchImpl = fetchReturning(200, { successful: true });

    await fundAccountWithFriendbot(ADDRESS, {
      friendbotUrl: "https://friendbot.test",
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      `https://friendbot.test/?addr=${encodeURIComponent(ADDRESS)}`,
      { method: "GET" },
    );
  });

  it("rejects when the active network has no faucet", async () => {
    const error = await captureError(
      fundAccountWithFriendbot(ADDRESS, { friendbotUrl: null }),
    );

    expect(error.code).toBe("unsupported_network");
    expect(error.retryable).toBe(false);
    expect(error.message).toContain("only available on Testnet");
  });

  it("treats a Horizon op_already_exists response as success", async () => {
    const fetchImpl = fetchReturning(400, {
      type: "https://stellar.org/horizon-errors/transaction_failed",
      title: "Transaction Failed",
      status: 400,
      detail: "The transaction failed when submitted to the stellar network.",
      extras: {
        result_codes: {
          transaction: "tx_failed",
          operations: ["op_already_exists"],
        },
      },
    });

    await expect(
      fundAccountWithFriendbot(ADDRESS, {
        friendbotUrl: "https://friendbot.test",
        fetchImpl,
      }),
    ).resolves.toBeUndefined();
  });

  it("treats the legacy createAccountAlreadyExist text as success", async () => {
    const fetchImpl = fetchReturning(
      400,
      "createAccountAlreadyExist (AAAAAAAAAGT/////AAAAAQAAAAAAAAAA/////AAAAAA=)",
    );

    await expect(
      fundAccountWithFriendbot(ADDRESS, {
        friendbotUrl: "https://friendbot.test",
        fetchImpl,
      }),
    ).resolves.toBeUndefined();
  });

  it("treats an already-funded account as success", async () => {
    const fetchImpl = fetchReturning(400, {
      type: "https://stellar.org/horizon-errors/bad_request",
      title: "Bad Request",
      status: 400,
      detail:
        "destination already funded: account already funded to starting balance",
    });

    await expect(
      fundAccountWithFriendbot(ADDRESS, {
        friendbotUrl: "https://friendbot.test",
        fetchImpl,
      }),
    ).resolves.toBeUndefined();
  });

  it("maps an invalid address to actionable guidance", async () => {
    const fetchImpl = fetchReturning(400, {
      type: "https://stellar.org/horizon-errors/invalid_field",
      title: "Invalid Field",
      status: 400,
      detail: "The field 'addr' is invalid.",
      extras: {
        invalid_field: "addr",
        reason: "invalid address: must be a valid G or C address",
      },
    });

    const error = await captureError(
      fundAccountWithFriendbot(ADDRESS, {
        friendbotUrl: "https://friendbot.test",
        fetchImpl,
      }),
    );

    expect(error.code).toBe("invalid_address");
    expect(error.status).toBe(400);
    expect(error.retryable).toBe(false);
    expect(error.message).toContain("valid Stellar Testnet public key");
    expect(error.detail).toContain("invalid address");
  });

  it("prefers the operation code over the generic transaction code", async () => {
    const fetchImpl = fetchReturning(400, {
      type: "https://stellar.org/horizon-errors/transaction_failed",
      title: "Transaction Failed",
      status: 400,
      detail: "The transaction failed when submitted to the stellar network.",
      extras: {
        result_codes: {
          transaction: "tx_failed",
          operations: ["op_low_reserve"],
        },
      },
    });

    const error = await captureError(
      fundAccountWithFriendbot(ADDRESS, {
        friendbotUrl: "https://friendbot.test",
        fetchImpl,
      }),
    );

    expect(error.code).toBe("op_low_reserve");
    expect(error.friendbotCode).toBe("op_low_reserve");
    expect(error.retryable).toBe(false);
    expect(error.message).toContain("minimum XLM reserve");
  });

  it("falls back to the transaction code when there are no operation codes", async () => {
    const fetchImpl = fetchReturning(400, {
      type: "https://stellar.org/horizon-errors/transaction_failed",
      title: "Transaction Failed",
      status: 400,
      detail: "The transaction failed when submitted to the stellar network.",
      extras: {
        result_codes: {
          transaction: "tx_bad_seq",
          operations: [],
        },
      },
    });

    const error = await captureError(
      fundAccountWithFriendbot(ADDRESS, {
        friendbotUrl: "https://friendbot.test",
        fetchImpl,
      }),
    );

    expect(error.code).toBe("tx_bad_seq");
    expect(error.retryable).toBe(true);
    expect(error.message).toContain("sequence-number conflict");
  });

  it("maps rate limiting to a retryable error", async () => {
    const fetchImpl = fetchReturning(429, {
      type: "https://stellar.org/horizon-errors/too_many_requests",
      title: "Too Many Requests",
      status: 429,
      detail: "rate limit exceeded",
    });

    const error = await captureError(
      fundAccountWithFriendbot(ADDRESS, {
        friendbotUrl: "https://friendbot.test",
        fetchImpl,
      }),
    );

    expect(error.code).toBe("rate_limited");
    expect(error.status).toBe(429);
    expect(error.retryable).toBe(true);
    expect(error.message).toContain("Wait a minute");
  });

  it("maps a server error page to a retryable error", async () => {
    const fetchImpl = fetchReturning(
      502,
      "<html><body><h1>Bad Gateway</h1></body></html>",
    );

    const error = await captureError(
      fundAccountWithFriendbot(ADDRESS, {
        friendbotUrl: "https://friendbot.test",
        fetchImpl,
      }),
    );

    expect(error.code).toBe("server_error");
    expect(error.status).toBe(502);
    expect(error.retryable).toBe(true);
    expect(error.detail).toBe("Bad Gateway");
    expect(error.message).toContain("temporarily unavailable");
  });

  it("preserves the detail of an unrecognised response", async () => {
    const fetchImpl = fetchReturning(400, {
      type: "https://stellar.org/horizon-errors/bad_request",
      title: "Bad Request",
      status: 400,
      detail: "Request parameters are not escaped or incorrectly formatted.",
    });

    const error = await captureError(
      fundAccountWithFriendbot(ADDRESS, {
        friendbotUrl: "https://friendbot.test",
        fetchImpl,
      }),
    );

    expect(error.code).toBe("unknown");
    expect(error.retryable).toBe(false);
    expect(error.message).toContain(
      "Request parameters are not escaped or incorrectly formatted.",
    );
  });

  it("handles a non-JSON error body", async () => {
    const fetchImpl = fetchReturning(400, "unexpected failure");

    const error = await captureError(
      fundAccountWithFriendbot(ADDRESS, {
        friendbotUrl: "https://friendbot.test",
        fetchImpl,
      }),
    );

    expect(error.code).toBe("unknown");
    expect(error.detail).toBe("unexpected failure");
  });

  it("maps a network failure to a retryable error", async () => {
    const fetchImpl = jest
      .fn()
      .mockRejectedValue(new Error("connection refused"));

    const error = await captureError(
      fundAccountWithFriendbot(ADDRESS, {
        friendbotUrl: "https://friendbot.test",
        fetchImpl,
      }),
    );

    expect(error.code).toBe("network_error");
    expect(error.status).toBeNull();
    expect(error.retryable).toBe(true);
    expect(error.detail).toBe("connection refused");
    expect(error.message).toContain("Could not reach Friendbot");
  });
});
