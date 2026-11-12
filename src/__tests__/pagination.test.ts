/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET as getTrades } from '@/app/api/v1/markets/[pair]/trades/route';
import { resetTradingEngine, getTradingEngine } from '@/lib/trading-instance';
import { buildOffsetPagination } from '@/lib/pagination';

// The trading engine is a process-wide singleton; reset it before each
// test so pagination state does not leak between cases.
beforeEach(() => {
  resetTradingEngine();
});

describe('buildOffsetPagination', () => {
  it('reports an empty, zero-page result set for no items', () => {
    const pagination = buildOffsetPagination({
      total: 0,
      page: 1,
      limit: 50,
      baseUrl: 'http://localhost/api/v1/markets/BTC%2FUSDT/trades?page=1&limit=50',
    });

    expect(pagination).toMatchObject({
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    });
    expect(pagination.links.prev).toBeNull();
    expect(pagination.links.next).toBeNull();
    expect(pagination.links.last).toBeNull();
    expect(pagination.links.first).toContain('page=1');
  });

  it('marks a full single page as having no next page', () => {
    const pagination = buildOffsetPagination({
      total: 50,
      page: 1,
      limit: 50,
      baseUrl: 'http://localhost/api/v1/markets/BTC%2FUSDT/trades?page=1&limit=50',
    });

    expect(pagination).toMatchObject({
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    });
    expect(pagination.links.next).toBeNull();
    expect(pagination.links.last).toContain('page=1');
  });

  it('emits prev and next links with the page parameter swapped', () => {
    const pagination = buildOffsetPagination({
      total: 120,
      page: 2,
      limit: 50,
      baseUrl: 'http://localhost/api/v1/markets/BTC%2FUSDT/trades?pair=BTC%2FUSDT&page=2&limit=50',
    });

    expect(pagination).toMatchObject({
      total: 120,
      page: 2,
      limit: 50,
      totalPages: 3,
      hasPreviousPage: true,
      hasNextPage: true,
    });
    expect(pagination.links.first).toContain('page=1');
    expect(pagination.links.prev).toContain('page=1');
    expect(pagination.links.next).toContain('page=3');
    expect(pagination.links.last).toContain('page=3');
    // Unrelated query parameters survive link generation.
    expect(pagination.links.next).toContain('pair=BTC%2FUSDT');
  });

  it('nulls the next link on the last page and the prev link on the first', () => {
    const last = buildOffsetPagination({
      total: 120,
      page: 3,
      limit: 50,
      baseUrl: 'http://localhost/api/v1/markets/BTC%2FUSDT/trades?page=3&limit=50',
    });
    expect(last.hasNextPage).toBe(false);
    expect(last.links.next).toBeNull();
    expect(last.links.prev).toContain('page=2');

    const first = buildOffsetPagination({
      total: 120,
      page: 1,
      limit: 50,
      baseUrl: 'http://localhost/api/v1/markets/BTC%2FUSDT/trades?page=1&limit=50',
    });
    expect(first.links.prev).toBeNull();
    expect(first.links.next).toContain('page=2');
  });

  it('clamps out-of-range inputs instead of trusting the caller', () => {
    const pagination = buildOffsetPagination({
      total: 25,
      page: 0,
      limit: 0,
      baseUrl: 'http://localhost/api/v1/markets/BTC%2FUSDT/trades?page=0&limit=0',
    });

    expect(pagination.page).toBe(1);
    expect(pagination.limit).toBe(1);
    expect(pagination.totalPages).toBe(25);

    const negative = buildOffsetPagination({
      total: -5,
      page: 1,
      limit: 50,
      baseUrl: 'http://localhost/api/v1/markets/BTC%2FUSDT/trades?page=1&limit=50',
    });
    expect(negative.total).toBe(0);
    expect(negative.totalPages).toBe(0);
  });

  it('is deterministic: identical inputs yield identical metadata', () => {
    const input = {
      total: 120,
      page: 2,
      limit: 50,
      baseUrl: 'http://localhost/api/v1/markets/BTC%2FUSDT/trades?page=2&limit=50',
    };
    expect(buildOffsetPagination(input)).toEqual(buildOffsetPagination(input));
  });
});

describe('GET /api/v1/markets/[pair]/trades - standard pagination (issue #77)', () => {
  function createMockTradesRequest(url: string) {
    return new NextRequest(new URL(url, 'http://localhost'), {
      headers: { 'x-api-key': 'sk_test_12345' },
    });
  }

  function placeTrades(count: number) {
    const engine = getTradingEngine();
    // One fill per iteration: the buy crosses only the resting sell at the
    // same price, so `count` executions are recorded.
    for (let i = 0; i < count; i += 1) {
      const price = 1 + i * 0.01;
      engine.submitOrder({
        pair: 'XLM/USD',
        side: 'sell',
        type: 'limit',
        price,
        quantity: 1,
        clientId: `maker_${i}`,
      });
      engine.submitOrder({
        pair: 'XLM/USD',
        side: 'buy',
        type: 'limit',
        price,
        quantity: 1,
        clientId: `taker_${i}`,
      });
    }
  }

  it('returns both the standard pagination object and the legacy flat fields', async () => {
    const response = await getTrades(
      createMockTradesRequest('http://localhost/api/v1/markets/XLM%2FUSD/trades?page=1&limit=50'),
      { params: Promise.resolve({ pair: 'XLM/USD' }) }
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.metadata).toMatchObject({
      apiVersion: 'v1',
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
    });
    expect(body.metadata.pagination).toMatchObject({
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    });
    expect(body.metadata.pagination.links).toMatchObject({
      prev: null,
      next: null,
      last: null,
    });
  });

  it('points the next link at page 2 and the prev link back at page 1', async () => {
    placeTrades(3);

    const page1 = await getTrades(
      createMockTradesRequest('http://localhost/api/v1/markets/XLM%2FUSD/trades?page=1&limit=2'),
      { params: Promise.resolve({ pair: 'XLM/USD' }) }
    );
    const body1 = await page1.json();

    expect(body1.metadata.pagination).toMatchObject({
      total: 3,
      page: 1,
      limit: 2,
      totalPages: 2,
      hasPreviousPage: false,
      hasNextPage: true,
    });
    expect(body1.metadata.pagination.links.next).toContain('page=2');
    expect(body1.metadata.pagination.links.prev).toBeNull();

    const page2 = await getTrades(
      createMockTradesRequest('http://localhost/api/v1/markets/XLM%2FUSD/trades?page=2&limit=2'),
      { params: Promise.resolve({ pair: 'XLM/USD' }) }
    );
    const body2 = await page2.json();

    expect(body2.metadata.pagination).toMatchObject({
      total: 3,
      page: 2,
      limit: 2,
      totalPages: 2,
      hasPreviousPage: true,
      hasNextPage: false,
    });
    expect(body2.metadata.pagination.links.prev).toContain('page=1');
    expect(body2.metadata.pagination.links.next).toBeNull();
    expect(Array.isArray(body2.data)).toBe(true);
    expect(body2.data).toHaveLength(1);
  });
});
