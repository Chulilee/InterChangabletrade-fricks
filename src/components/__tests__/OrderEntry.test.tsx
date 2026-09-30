import { render, screen, fireEvent } from "@testing-library/react";
import { OrderEntry } from "../OrderEntry";
import type { Order } from "@/mocks/server";

const CURRENT_PRICE = 40000;

function renderEntry(onPlaceOrder = jest.fn(), currentPrice = CURRENT_PRICE) {
  render(<OrderEntry currentPrice={currentPrice} onPlaceOrder={onPlaceOrder} />);
  return { onPlaceOrder };
}

/**
 * Both the side tab and the submit button carry the side name ("Buy" / "Sell"),
 * and the tabs come first in the DOM, so index 0 is the tab and index 1 is the
 * submit button.
 */
function sideTab(name: "Buy" | "Sell"): HTMLButtonElement {
  return screen.getAllByRole("button", { name })[0];
}

function submitButton(): HTMLButtonElement {
  return screen.getAllByRole("button", { name: "Buy" })[1];
}

function priceInput(): HTMLInputElement {
  return screen.getByLabelText("Price") as HTMLInputElement;
}

function sizeInput(): HTMLInputElement {
  return screen.getByLabelText("Size") as HTMLInputElement;
}

function selectMarketOrderType(): void {
  fireEvent.click(screen.getByRole("button", { name: "Market" }));
}

function selectLimitOrderType(): void {
  fireEvent.click(screen.getByRole("button", { name: "Limit" }));
}

describe("OrderEntry order type and price", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("seeds the price field with the current market price", () => {
    renderEntry();

    expect(priceInput().valueAsNumber).toBe(CURRENT_PRICE);
  });

  it("keeps the typed price for a limit order", () => {
    const { onPlaceOrder } = renderEntry();

    fireEvent.change(priceInput(), { target: { value: "39000" } });
    fireEvent.change(sizeInput(), { target: { value: "2" } });
    fireEvent.click(submitButton());

    expect(onPlaceOrder).toHaveBeenCalledTimes(1);
    expect(onPlaceOrder.mock.calls[0][0]).toMatchObject({
      type: "limit",
      side: "buy",
      price: 39000,
      size: 2,
      status: "open",
    });
  });

  it("replaces the price field with a read-only market price for market orders", () => {
    renderEntry();

    expect(screen.getByTestId("market-price")).not.toBeInTheDocument();

    selectMarketOrderType();

    expect(screen.queryByLabelText("Price")).not.toBeInTheDocument();
    expect(screen.getByTestId("market-price")).toBeInTheDocument();
  });

  it("submits a market order at the current market price", () => {
    const { onPlaceOrder } = renderEntry();

    selectMarketOrderType();
    fireEvent.change(sizeInput(), { target: { value: "1.5" } });
    fireEvent.click(submitButton());

    expect(onPlaceOrder).toHaveBeenCalledTimes(1);
    expect(onPlaceOrder.mock.calls[0][0]).toMatchObject({
      type: "market",
      price: CURRENT_PRICE,
      size: 1.5,
    });
  });

  it("ignores a stale typed price once a market order is selected", () => {
    const { onPlaceOrder } = renderEntry();

    // Type a custom limit price, then switch to market.
    fireEvent.change(priceInput(), { target: { value: "1" } });
    selectMarketOrderType();
    fireEvent.change(sizeInput(), { target: { value: "1" } });
    fireEvent.click(submitButton());

    expect(onPlaceOrder.mock.calls[0][0].price).toBe(CURRENT_PRICE);
  });

  it("discards the typed price on switching to market and re-seeds it from the feed", () => {
    renderEntry();

    fireEvent.change(priceInput(), { target: { value: "1" } });
    selectMarketOrderType();
    selectLimitOrderType();

    // The custom price is gone; the field holds the market price again.
    expect(priceInput().valueAsNumber).toBe(CURRENT_PRICE);
  });

  it("leaves a typed limit price in place while staying in limit mode", () => {
    renderEntry();

    fireEvent.change(priceInput(), { target: { value: "39000" } });
    fireEvent.change(priceInput(), { target: { value: "39500" } });

    expect(priceInput().valueAsNumber).toBe(39500);
  });

  it("shows the market price the market order will trade at", () => {
    renderEntry();

    selectMarketOrderType();

    expect(screen.getByTestId("market-price")).toHaveTextContent(
      CURRENT_PRICE.toFixed(2),
    );
  });

  it("reports an unavailable market price rather than showing a zero", () => {
    renderEntry(jest.fn(), 0);

    selectMarketOrderType();

    expect(screen.getByTestId("market-price")).toHaveTextContent("Unavailable");
  });

  it("explains how market orders get their price", () => {
    renderEntry();

    expect(screen.queryByTestId("market-order-hint")).not.toBeInTheDocument();

    selectMarketOrderType();

    expect(screen.getByTestId("market-order-hint")).toBeInTheDocument();
  });

  it("reflects the effective price in the order value", () => {
    renderEntry();

    expect(screen.getByTestId("order-value")).toHaveTextContent("--");

    fireEvent.change(sizeInput(), { target: { value: "2" } });
    expect(screen.getByTestId("order-value")).toHaveTextContent("80000.00");

    // The order value follows the market price, not the hidden limit price.
    selectMarketOrderType();
    expect(screen.getByTestId("order-value")).toHaveTextContent("80000.00");

    fireEvent.change(sizeInput(), { target: { value: "3" } });
    expect(screen.getByTestId("order-value")).toHaveTextContent("120000.00");
  });

  it("refuses to submit a market order when there is no usable market price", () => {
    const { onPlaceOrder } = renderEntry(jest.fn(), 0);

    selectMarketOrderType();
    fireEvent.change(sizeInput(), { target: { value: "1" } });

    expect(submitButton()).toBeDisabled();
    fireEvent.click(submitButton());
    expect(onPlaceOrder).not.toHaveBeenCalled();
  });

  it("does not compute percentage sizes without a usable price", () => {
    renderEntry(jest.fn(), 0);

    selectMarketOrderType();
    fireEvent.click(screen.getByRole("button", { name: "100%" }));

    expect(sizeInput().value).toBe("");
  });

  it("computes percentage sizes from the market price for a market order", () => {
    renderEntry();

    selectMarketOrderType();
    fireEvent.click(screen.getByRole("button", { name: "50%" }));

    // 10000 USD mock balance at 40000 buys 0.25, so 50% is 0.125.
    expect(sizeInput().valueAsNumber).toBeCloseTo(0.125, 6);
  });

  it("keeps the submit button disabled until a size is entered", () => {
    const { onPlaceOrder } = renderEntry();

    expect(submitButton()).toBeDisabled();
    fireEvent.click(submitButton());
    expect(onPlaceOrder).not.toHaveBeenCalled();

    fireEvent.change(sizeInput(), { target: { value: "1" } });
    expect(submitButton()).toBeEnabled();
  });

  it("submits a sell market order at the market price", () => {
    const { onPlaceOrder } = renderEntry();

    fireEvent.click(sideTab("Sell"));
    selectMarketOrderType();
    fireEvent.change(sizeInput(), { target: { value: "0.25" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Sell" })[1]);

    expect(onPlaceOrder).toHaveBeenCalledTimes(1);
    const order = onPlaceOrder.mock.calls[0][0] as Order;
    expect(order).toMatchObject({
      type: "market",
      side: "sell",
      price: CURRENT_PRICE,
      size: 0.25,
      status: "open",
    });
  });

  it("clears the size after a successful submit", () => {
    renderEntry();

    fireEvent.change(sizeInput(), { target: { value: "2" } });
    fireEvent.click(submitButton());

    expect(sizeInput().value).toBe("");
    expect(screen.getByTestId("order-value")).toHaveTextContent("--");
  });
});