import { Account, Transaction } from "@stellar/stellar-sdk";
import { horizon } from "@/lib/stellar/horizon";
import {
  buildDexOfferTx,
  type DexOrderParams,
} from "@/lib/stellar/dex";

jest.mock("@/lib/stellar/horizon", () => {
  const actual = jest.requireActual("@/lib/stellar/horizon");
  return {
    ...actual,
    horizon: {
      loadAccount: jest.fn(),
    },
  };
});

const PUBLIC_KEY = "GDJIN6W6PLTPKLLM57UW65ZH4BITUXUMYQHIMAZFYXF45PZVAWDBI77Z";
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

const loadAccountMock = horizon.loadAccount as unknown as jest.Mock;

beforeEach(() => {
  loadAccountMock.mockReset();
  loadAccountMock.mockResolvedValue(new Account(PUBLIC_KEY, "100"));
});

function validParams(overrides: Partial<DexOrderParams> = {}): DexOrderParams {
  return {
    publicKey: PUBLIC_KEY,
    base: { code: "USDC", issuer: USDC_ISSUER },
    counter: { code: "XLM", issuer: null },
    side: "sell",
    amount: "10",
    price: "1.5",
    ...overrides,
  };
}

describe("buildDexOfferTx asset validation", () => {
  it("builds a transaction for a valid credit asset", async () => {
    const tx = await buildDexOfferTx(validParams());

    expect(tx).toBeInstanceOf(Transaction);
    expect(loadAccountMock).toHaveBeenCalledWith(PUBLIC_KEY);
  });

  it("builds a transaction for a native base asset", async () => {
    const tx = await buildDexOfferTx(
      validParams({
        base: { code: "XLM", issuer: null },
        counter: { code: "USDC", issuer: USDC_ISSUER },
        side: "buy",
      }),
    );

    expect(tx).toBeInstanceOf(Transaction);
  });

  it("rejects base and counter both native XLM", async () => {
    await expect(
      buildDexOfferTx(
        validParams({
          base: { code: "XLM", issuer: null },
          counter: { code: "XLM", issuer: null },
        }),
      ),
    ).rejects.toThrow("cannot both be native XLM");
  });

  it("rejects a base asset code longer than 12 characters", async () => {
    await expect(
      buildDexOfferTx(
        validParams({
          base: { code: "TOOLONGASSETX", issuer: USDC_ISSUER },
        }),
      ),
    ).rejects.toThrow("Base asset invalid");
  });

  it("rejects a base asset code with special characters", async () => {
    await expect(
      buildDexOfferTx(
        validParams({
          base: { code: "USDC!", issuer: USDC_ISSUER },
        }),
      ),
    ).rejects.toThrow("Base asset invalid");
  });

  it("rejects a base asset with a malformed issuer key", async () => {
    await expect(
      buildDexOfferTx(
        validParams({
          base: { code: "USDC", issuer: "NOT_A_VALID_KEY" },
        }),
      ),
    ).rejects.toThrow("Base asset invalid");
  });

  it("rejects a counter asset with a missing issuer", async () => {
    await expect(
      buildDexOfferTx(
        validParams({
          counter: { code: "USDC", issuer: null },
        }),
      ),
    ).rejects.toThrow("Counter asset invalid");
  });

  it("rejects a counter asset code that is empty", async () => {
    await expect(
      buildDexOfferTx(
        validParams({
          counter: { code: "", issuer: USDC_ISSUER },
        }),
      ),
    ).rejects.toThrow("Counter asset invalid");
  });

  it("rejects before touching Horizon when assets are invalid", async () => {
    await expect(
      buildDexOfferTx(
        validParams({
          base: { code: "USDC", issuer: "g" + USDC_ISSUER.slice(1) },
        }),
      ),
    ).rejects.toThrow();

    expect(loadAccountMock).not.toHaveBeenCalled();
  });
});
