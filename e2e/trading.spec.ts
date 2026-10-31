import { test, expect } from '@playwright/test';
import { TradingPage } from './pages/TradingPage';

/**
 * User journey over the trading dashboard.
 *
 * Selectors go through the TradingPage page object, which is anchored on
 * data-testid attributes: copy or styling changes must not break the suite.
 */
test('Trading Dashboard User Journey', async ({ page }) => {
  const trading = new TradingPage(page);

  // Load page and verify the panels render
  await trading.open();
  await expect(trading.orderBookBids).toBeVisible();
  await expect(trading.orderBookAsks).toBeVisible();

  // Enter order details and submit
  await trading.placeLimitBuyOrder('0.5');

  // Verify optimistic UI in the My Orders table
  const row = trading.firstOrderRow();
  await expect(row.getByTestId('order-side')).toHaveText('buy');
  await expect(row.getByTestId('order-size')).toHaveText('0.5000');

  // Cancel order flow
  await trading.cancelFirstOrder();

  // Verify cancellation
  await expect(row.getByTestId('order-status-cancelled')).toBeVisible();
});
