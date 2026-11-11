import { Account, Transaction } from "@stellar/stellar-sdk";
import { horizon } from "@/lib/stellar/horizon";
import {
  buildCancelOfferTx,
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
    ).rejects.toThrow('Base asset code "TOOLONGASSETX" is invalid');
  });

  it("rejects a base asset code with special characters", async () => {
    await expect(
      buildDexOfferTx(
        validParams({
          base: { code: "USDC!", issuer: USDC_ISSUER },
        }),
      ),
    ).rejects.toThrow('Base asset code "USDC!" is invalid');
  });

  it("rejects a base asset with a malformed issuer key", async () => {
    await expect(
      buildDexOfferTx(
        validParams({
          base: { code: "USDC", issuer: "NOT_A_VALID_KEY" },
        }),
      ),
    ).rejects.toThrow('Base asset issuer "NOT_A_VALID_KEY" is not a valid Stellar account ID');
  });

  it("rejects a counter asset with a missing issuer", async () => {
    await expect(
      buildDexOfferTx(
        validParams({
          counter: { code: "USDC", issuer: null },
        }),
      ),
    ).rejects.toThrow("Counter asset issuer is required for the USDC asset");
  });

  it("rejects a counter asset code that is empty", async () => {
    await expect(
      buildDexOfferTx(
        validParams({
          counter: { code: "", issuer: USDC_ISSUER },
        }),
      ),
    ).rejects.toThrow('Counter asset code "" is invalid');
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

/** The single manage-sell-offer operation of a built transaction. */
function sellOfferOf(tx: Transaction) {
  const op = tx.operations[0];
  if (op.type !== "manageSellOffer") {
    throw new Error(`expected a manageSellOffer operation, got ${op.type}`);
  }
  return op;
}

/** The single manage-buy-offer operation of a built transaction. */
function buyOfferOf(tx: Transaction) {
  const op = tx.operations[0];
  if (op.type !== "manageBuyOffer") {
    throw new Error(`expected a manageBuyOffer operation, got ${op.type}`);
  }
  return op;
}

describe("buildCancelOfferTx", () => {
  const base = { code: "USDC", issuer: USDC_ISSUER };
  const counter = { code: "XLM", issuer: null };

  it("cancels a sell offer with a zero amount and no arbitrary price", async () => {
    const tx = await buildCancelOfferTx(
      PUBLIC_KEY,
      base,
      counter,
      "sell",
      "42",
    );

    expect(tx).toBeInstanceOf(Transaction);
    expect(tx.operations).toHaveLength(1);

    const op = sellOfferOf(tx);
    expect(Number(op.amount)).toBe(0);
    expect(Number(op.price)).toBe(0);
    expect(op.offerId).toBe("42");
  });

  it("cancels a buy offer with a zero buy amount", async () => {
    const tx = await buildCancelOfferTx(
      PUBLIC_KEY,
      base,
      counter,
      "buy",
      "7",
    );

    const op = buyOfferOf(tx);
    expect(Number(op.buyAmount)).toBe(0);
    expect(Number(op.price)).toBe(0);
    expect(op.offerId).toBe("7");
  });

  it("keeps the assets of the offer it cancels", async () => {
    const tx = await buildCancelOfferTx(
      PUBLIC_KEY,
      base,
      counter,
      "sell",
      "1",
    );

    const op = sellOfferOf(tx);
    expect(op.selling.getCode()).toBe("USDC");
    expect(op.selling.getIssuer()).toBe(USDC_ISSUER);
    expect(op.buying.isNative()).toBe(true);
  });

  it("mirrors the asset orientation of the order it cancels", async () => {
    const tx = await buildCancelOfferTx(
      PUBLIC_KEY,
      base,
      counter,
      "buy",
      "1",
    );

    const op = buyOfferOf(tx);
    expect(op.buying.getCode()).toBe("USDC");
    expect(op.buying.getIssuer()).toBe(USDC_ISSUER);
    expect(op.selling.isNative()).toBe(true);
  });

  it("rejects an invalid asset before loading the account", async () => {
    await expect(
      buildCancelOfferTx(
        PUBLIC_KEY,
        { code: "USDC", issuer: "not-a-stellar-account" },
        counter,
        "sell",
        "1",
      ),
    ).rejects.toThrow(/issuer/);

    expect(loadAccountMock).not.toHaveBeenCalled();
  });

  it("rejects base and counter both native XLM", async () => {
    await expect(
      buildCancelOfferTx(
        PUBLIC_KEY,
        { code: "XLM", issuer: null },
        { code: "XLM", issuer: null },
        "sell",
        "1",
      ),
    ).rejects.toThrow("cannot both be native XLM");

    expect(loadAccountMock).not.toHaveBeenCalled();
  });
});
