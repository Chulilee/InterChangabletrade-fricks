/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { validateApiKey, hasPermission } from '@/lib/api-middleware';
import { getAuthModule } from '@/lib/auth-instance';
import { getTradingEngine, resetTradingEngine } from '@/lib/trading-instance';
import { POST as submitOrder } from '@/app/api/v1/orders/route';
import { GET as getOrderBook } from '@/app/api/v1/markets/[pair]/book/route';
import { GET as getTrades } from '@/app/api/v1/markets/[pair]/trades/route';

interface MockRequestOptions {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
}

// Mock NextRequest
function createMockRequest(url: string, options: MockRequestOptions = {}) {
  const request = new NextRequest(new URL(url, 'http://localhost'), {
    headers: {
      'x-api-key': 'sk_test_12345',
      ...options.headers,
    },
    ...options,
  });
  return request;
}

// The trading engine is a process-wide singleton shared by the route handlers.
// Reset it before each test so cases don't leak order-book state into each other.
beforeEach(() => {
  resetTradingEngine();
});

describe('API Middleware', () => {
  it('accepts the documented demo key as an admin client', async () => {
    const demoRequest = new NextRequest('http://localhost/api/v1/orders', {
      headers: { 'x-api-key': 'sk_test_12345' },
    });
    const demoResult = await validateApiKey(demoRequest);
    expect(demoResult.valid).toBe(true);
    expect(demoResult.clientId).toBe('client_demo');
    expect(demoResult.roles).toContain('admin');

    const missingKeyRequest = new NextRequest('http://localhost/api/v1/orders', {});
    const missingResult = await validateApiKey(missingKeyRequest);
    expect(missingResult.valid).toBe(false);

    const invalidKeyRequest = new NextRequest('http://localhost/api/v1/orders', {
      headers: { 'x-api-key': 'sk_not_a_real_key' },
    });
    const invalidResult = await validateApiKey(invalidKeyRequest);
    expect(invalidResult.valid).toBe(false);
  });

  it('validates keys issued by the AuthModule and maps roles', async () => {
    const auth = getAuthModule();
    const { rawKey } = await auth.createApiKey({
      name: 'Route Test Key',
      roles: ['trader'],
    });

    const request = new NextRequest('http://localhost/api/v1/orders', {
      headers: { 'x-api-key': rawKey },
    });
    const result = await validateApiKey(request);
    expect(result.valid).toBe(true);
    expect(result.roles).toEqual(['trader']);

    // Revocation must take effect immediately.
    const keyId = result.authContext!.apiKeyId;
    expect(auth.revokeApiKey(keyId)).toBe(true);
    const revoked = await validateApiKey(request);
    expect(revoked.valid).toBe(false);
  });

  it('enforces role permissions per resource and action', async () => {
    const auth = getAuthModule();
    const { rawKey } = await auth.createApiKey({
      name: 'Read Only Key',
      roles: ['read-only'],
    });
    const request = new NextRequest('http://localhost/api/v1/orders', {
      headers: { 'x-api-key': rawKey },
    });
    const result = await validateApiKey(request);

    expect(hasPermission(result, 'orders', 'read')).toBe(true);
    expect(hasPermission(result, 'orders', 'create')).toBe(false);
    expect(hasPermission(result, 'portfolio', 'read')).toBe(true);
  });
});

describe('Order API', () => {
  it('submits a valid order', async () => {
    const request = createMockRequest('http://localhost/api/v1/orders', {
      method: 'POST',
      body: JSON.stringify({
        pair: 'BTC/USDT',
        side: 'buy',
        type: 'limit',
        price: 50000,
        quantity: 0.1,
      }),
    });

    const response = await submitOrder(request);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.data.orderId).toBeDefined();
    expect(data.data.status).toBe('open');
  });

  it('rejects invalid order data', async () => {
    const request = createMockRequest('http://localhost/api/v1/orders', {
      method: 'POST',
      body: JSON.stringify({
        // Missing required fields
        pair: 'BTC/USDT',
      }),
    });

    const response = await submitOrder(request);
    expect(response.status).toBe(400);
  });
});

describe('Market Data API', () => {
  it('returns empty order book for new pair', async () => {
    const request = createMockRequest('http://localhost/api/v1/markets/BTC/USDT/book?depth=10');
    const response = await getOrderBook(request, { params: Promise.resolve({ pair: 'BTC/USDT' }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.pair).toBe('BTC/USDT');
    expect(data.data.bids).toEqual([]);
    expect(data.data.asks).toEqual([]);
  });

  it('returns paginated trades', async () => {
    const request = createMockRequest('http://localhost/api/v1/markets/BTC/USDT/trades?page=1&limit=50');
    const response = await getTrades(request, { params: Promise.resolve({ pair: 'BTC/USDT' }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.metadata.total).toBeDefined();
    expect(data.metadata.page).toBe(1);
  });
});

describe('TradingEngine extended functionality', () => {
  it('tracks historical trades', () => {
    const engine = getTradingEngine();
    
    // Submit two orders that will match
    engine.submitOrder({
      pair: 'BTC/USDT',
      side: 'sell',
      type: 'limit',
      price: 50000,
      quantity: 0.1,
      clientId: 'client1',
    });

    engine.submitOrder({
      pair: 'BTC/USDT',
      side: 'buy',
      type: 'limit',
      price: 50000,
      quantity: 0.1,
      clientId: 'client2',
    });

    // Check that trades were recorded
    const trades = engine.getTrades('BTC/USDT');
    expect(trades.total).toBeGreaterThan(0);
    expect(trades.trades.length).toBeGreaterThan(0);
  });
});