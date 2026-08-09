/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { validateApiKey, createErrorResponse, createSuccessResponse } from '@/lib/api-middleware';
import { getTradingEngine } from '@/lib/trading-instance';
import { POST as submitOrder } from '@/app/api/v1/orders/route';
import { GET as getOrder, DELETE as cancelOrder } from '@/app/api/v1/orders/[id]/route';
import { GET as getOrderBook } from '@/app/api/v1/markets/[pair]/book/route';
import { GET as getTrades } from '@/app/api/v1/markets/[pair]/trades/route';

// Mock NextRequest
function createMockRequest(url: string, options: any = {}) {
  const request = new NextRequest(new URL(url, 'http://localhost'), {
    headers: {
      'x-api-key': 'sk_test_12345',
      ...options.headers,
    },
    ...options,
  });
  return request;
}

describe('API Middleware', () => {
  it('validates API key format correctly', () => {
    const validRequest = new NextRequest('http://localhost/api/v1/orders', {
      headers: { 'x-api-key': 'sk_test_123' },
    });
    const validResult = validateApiKey(validRequest);
    expect(validResult.valid).toBe(true);
    expect(validResult.clientId).toBe('client_test_123');

    const missingKeyRequest = new NextRequest('http://localhost/api/v1/orders', {});
    const missingResult = validateApiKey(missingKeyRequest);
    expect(missingResult.valid).toBe(false);

    const invalidFormatRequest = new NextRequest('http://localhost/api/v1/orders', {
      headers: { 'x-api-key': 'invalid_key' },
    });
    const invalidResult = validateApiKey(invalidFormatRequest);
    expect(invalidResult.valid).toBe(false);
  });
});

describe('Order API', () => {
  beforeEach(() => {
    // Reset the trading engine before each test
    jest.resetModules();
  });

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
    expect(data.data.status).toBe('pending');
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
    const sellOrder = engine.submitOrder({
      pair: 'BTC/USDT',
      side: 'sell',
      type: 'limit',
      price: 50000,
      quantity: 0.1,
      clientId: 'client1',
    });
    
    const buyOrder = engine.submitOrder({
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