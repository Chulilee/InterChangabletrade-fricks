import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Page object for the trading dashboard ("Live market" section on /).
 *
 * Every locator is anchored on the data-testid attributes added to
 * TradingDashboard, OrderBook, OrderEntry and UserOrders so the suite does
 * not break when copy, styling, or DOM nesting changes.
 */
export class TradingPage {
  readonly page: Page;

  // Dashboard structure
  readonly dashboard: Locator;
  readonly pair: Locator;
  readonly orderBook: Locator;
  readonly orderBookTitle: Locator;
  readonly orderBookBids: Locator;
  readonly orderBookAsks: Locator;
  readonly orderEntry: Locator;
  readonly orderEntryTitle: Locator;
  readonly userOrders: Locator;
  readonly userOrdersTitle: Locator;
  readonly ordersTable: Locator;

  // Order entry controls
  readonly limitTypeTab: Locator;
  readonly marketTypeTab: Locator;
  readonly buySideTab: Locator;
  readonly sellSideTab: Locator;
  readonly priceInput: Locator;
  readonly sizeInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.dashboard = page.getByTestId('trading-dashboard');
    this.pair = page.getByTestId('trading-pair');
    this.orderBook = page.getByTestId('order-book');
    this.orderBookTitle = page.getByTestId('order-book-title');
    this.orderBookBids = page.getByTestId('order-book-bids');
    this.orderBookAsks = page.getByTestId('order-book-asks');
    this.orderEntry = page.getByTestId('order-entry');
    this.orderEntryTitle = page.getByTestId('order-entry-title');
    this.userOrders = page.getByTestId('user-orders');
    this.userOrdersTitle = page.getByTestId('user-orders-title');
    this.ordersTable = page.getByTestId('orders-table');

    this.limitTypeTab = page.getByTestId('order-type-limit');
    this.marketTypeTab = page.getByTestId('order-type-market');
    this.buySideTab = page.getByTestId('side-buy');
    this.sellSideTab = page.getByTestId('side-sell');
    this.priceInput = page.getByTestId('order-entry-price-input');
    this.sizeInput = page.getByTestId('order-entry-size-input');
    this.submitButton = page.getByTestId('order-entry-submit');
  }

  /** Navigate to the dashboard and wait for its panels to render. */
  async open(): Promise<void> {
    await this.page.goto('/');
    await expect(this.pair).toHaveText('BTC/USD');
    await expect(this.orderBookTitle).toBeVisible();
    await expect(this.orderEntryTitle).toBeVisible();
    await expect(this.userOrdersTitle).toBeVisible();
  }

  /** First row in the My Orders table (newest submission sits last). */
  firstOrderRow(): Locator {
    return this.ordersTable.locator('tbody tr').first();
  }

  /** Place a limit buy order with the given size. */
  async placeLimitBuyOrder(size: string): Promise<void> {
    await this.limitTypeTab.click();
    await this.buySideTab.click();
    await this.sizeInput.fill(size);
    await this.submitButton.click();
  }

  /** Place a limit sell order with the given size. */
  async placeLimitSellOrder(size: string): Promise<void> {
    await this.limitTypeTab.click();
    await this.sellSideTab.click();
    await this.sizeInput.fill(size);
    await this.submitButton.click();
  }

  /** Cancel the first order in the My Orders table. */
  async cancelFirstOrder(): Promise<void> {
    await this.firstOrderRow().getByTestId('cancel-order').click();
  }
}
