import { test, expect } from '@playwright/test';

test('Trading Dashboard User Journey', async ({ page }) => {
  // Load page
  await page.goto('/');

  // Verify components render
  await expect(page.locator('h1', { hasText: 'BTC/USD' })).toBeVisible();
  await expect(page.locator('h3', { hasText: 'Order Book' })).toBeVisible();
  await expect(page.locator('h3', { hasText: 'Order Entry' })).toBeVisible();
  await expect(page.locator('h3', { hasText: 'My Orders' })).toBeVisible();

  // Enter order details
  await page.getByRole('button', { name: 'Limit' }).click();
  await page.getByRole('button', { name: 'Buy' }).click();
  
  // Fill size input (second input is Size)
  const sizeInput = page.locator('input[type="number"]').nth(1);
  await sizeInput.fill('0.5');

  // Submit order
  await page.locator('button[type="submit"]').click();

  // Verify optimistic UI
  await expect(page.locator('td', { hasText: 'buy' })).toBeVisible();
  await expect(page.locator('td', { hasText: '0.5000' })).toBeVisible();

  // Cancel order flow
  const cancelButton = page.locator('button', { hasText: 'Cancel' });
  await expect(cancelButton).toBeVisible();
  await cancelButton.click();

  // Verify cancellation
  await expect(page.locator('span', { hasText: 'Cancelled' })).toBeVisible();
});
