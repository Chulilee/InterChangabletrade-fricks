import { TradingEngine } from '@/lib/trading-engine';
import type { Order, TradeEvent } from '@/types/trading';

/**
 * Multi-level maker matching.
 *
 * These cover the sweep path in `matchOrder`: one incoming order walking
 * several resting orders on the same book. That path used to iterate the live
 * book array by index while `applyFill` spliced exhausted makers out of it, so
 * every removal shifted the tail one slot left and the cursor skipped a
 * resting order.
 */
describe('TradingEngine multi-level matching', () => {
  let engine: TradingEngine;

  beforeEach(() => {
    engine = new TradingEngine();
  });

  /** Rest three asks of 10 units each at 0.50 / 0.51 / 0.52. */
  function seedThreeLevelAskBook(): Order[] {
    return [0.5, 0.51, 0.52].map((price, index) =>
      engine.submitOrder({
        pair: 'XLM/USD',
        side: 'sell',
        type: 'limit',
        price,
        quantity: 10,
        clientId: `maker-${index}`,
      })!,
    );
  }

  it('sweeps every maker it crosses instead of skipping one per removal', () => {
    seedThreeLevelAskBook();

    const taker = engine.submitOrder({
      pair: 'XLM/USD',
      side: 'buy',
      type: 'market',
      price: 0.5,
      quantity: 25,
      clientId: 'taker',
    });

    // All three levels were reachable, so the taker must be fully filled.
    expect(taker?.status).toBe('filled');
    expect(taker?.filled).toBe(25);
    expect(taker?.remaining).toBe(0);
  });

  it('records one fill per maker, in price-priority order', () => {
    seedThreeLevelAskBook();

    const taker = engine.submitOrder({
      pair: 'XLM/USD',
      side: 'buy',
      type: 'market',
      price: 0.5,
      quantity: 25,
      clientId: 'taker',
    })!;

    const fills = engine.getOrderStatus(taker.id)!.fills;

    expect(fills).toHaveLength(3);
    expect(fills.map((f) => f.price)).toEqual([0.5, 0.51, 0.52]);
    expect(fills.map((f) => f.quantity)).toEqual([10, 10, 5]);
    // A maker is never filled twice within a single sweep.
    expect(new Set(fills.map((f) => f.makerOrderId)).size).toBe(3);
  });

  it('updates every maker it touches and drains the exhausted ones', () => {
    const makers = seedThreeLevelAskBook();

    const taker = engine.submitOrder({
      pair: 'XLM/USD',
      side: 'buy',
      type: 'market',
      price: 0.5,
      quantity: 25,
      clientId: 'taker',
    })!;

    const statuses = makers.map((m) => engine.getOrderStatus(m.id)!);

    // The first two makers were consumed outright and must carry a fill each.
    expect(statuses[0].status).toBe('filled');
    expect(statuses[0].remaining).toBe(0);
    expect(statuses[1].status).toBe('filled');
    expect(statuses[1].remaining).toBe(0);
    // The third is left resting with 5 of 10 filled.
    expect(statuses[2].status).toBe('partial_fill');
    expect(statuses[2].filled).toBe(5);
    expect(statuses[2].remaining).toBe(5);

    // Only the partially filled level is still published.
    const book = engine.getOrderBook('XLM/USD');
    expect(book.asks).toHaveLength(1);
    expect(book.asks[0].price).toBe(0.52);
    expect(book.asks[0].orderCount).toBe(1);
  });

  it('conserves quantity across the whole sweep', () => {
    seedThreeLevelAskBook();

    const taker = engine.submitOrder({
      pair: 'XLM/USD',
      side: 'buy',
      type: 'market',
      price: 0.5,
      quantity: 25,
      clientId: 'taker',
    })!;

    const fills = engine.getOrderStatus(taker.id)!.fills;
    const traded = fills.reduce((sum, f) => sum + f.quantity, 0);

    expect(traded).toBe(25);
    expect(taker.quantity).toBe(traded + taker.remaining);

    const { trades, total } = engine.getTrades('XLM/USD');
    expect(total).toBe(3);
    expect(trades.reduce((sum, t) => sum + t.quantity, 0)).toBe(25);
  });

  it('stops at the first maker the limit price does not cross', () => {
    seedThreeLevelAskBook();

    const taker = engine.submitOrder({
      pair: 'XLM/USD',
      side: 'buy',
      type: 'limit',
      price: 0.51,
      quantity: 100,
      clientId: 'taker',
    });

    // 0.50 and 0.51 cross, 0.52 does not.
    expect(taker?.filled).toBe(20);
    expect(taker?.remaining).toBe(80);
    expect(taker?.status).toBe('partial_fill');

    const book = engine.getOrderBook('XLM/USD');
    expect(book.asks.map((l) => l.price)).toEqual([0.52]);
    expect(book.asks[0].quantity).toBe(10);
    expect(book.bids.map((l) => l.price)).toEqual([0.51]);
  });

  it('never leaves a zero-quantity resting order in the book', () => {
    seedThreeLevelAskBook();

    engine.submitOrder({
      pair: 'XLM/USD',
      side: 'buy',
      type: 'market',
      price: 0.5,
      quantity: 30,
      clientId: 'taker',
    });

    const book = engine.getOrderBook('XLM/USD');
    expect(book.asks).toEqual([]);
    for (const level of [...book.bids, ...book.asks]) {
      expect(level.quantity).toBeGreaterThan(0);
      expect(level.orderCount).toBeGreaterThan(0);
    }
  });

  it('sweeps a two-sided book without touching the resting bid side', () => {
    // Six asks of 4 units: three at 0.50 and three at 0.51.
    for (let i = 0; i < 6; i++) {
      engine.submitOrder({
        pair: 'XLM/USD',
        side: 'sell',
        type: 'limit',
        price: i < 3 ? 0.5 : 0.51,
        quantity: 4,
        clientId: `ask-${i}`,
      });
    }

    // Three bids that do not cross the asks, so seeding stays quiet.
    for (let i = 0; i < 3; i++) {
      engine.submitOrder({
        pair: 'XLM/USD',
        side: 'buy',
        type: 'limit',
        price: i < 2 ? 0.49 : 0.48,
        quantity: 4,
        clientId: `bid-${i}`,
      });
    }

    const restingBefore = engine.getOrderBook('XLM/USD');
    expect(restingBefore.asks).toHaveLength(2);
    expect(restingBefore.bids).toHaveLength(2);

    // A taker big enough to consume every ask in one sweep.
    const taker = engine.submitOrder({
      pair: 'XLM/USD',
      side: 'buy',
      type: 'market',
      price: 0.5,
      quantity: 24,
      clientId: 'sweeper',
    });

    expect(taker?.filled).toBe(24);
    expect(taker?.remaining).toBe(0);
    expect(taker?.status).toBe('filled');

    const book = engine.getOrderBook('XLM/USD');
    expect(book.asks).toEqual([]);
    expect(book.bids).toHaveLength(2);
    expect(book.bids[0].price).toBe(0.49);
    expect(book.bids[0].orderCount).toBe(2);
    expect(book.bids[0].quantity).toBe(8);
    expect(book.bids[1].price).toBe(0.48);
    expect(book.bids[1].orderCount).toBe(1);
  });
});

describe('TradingEngine sweep events', () => {
  let engine: TradingEngine;
  let events: TradeEvent[];

  beforeEach(() => {
    engine = new TradingEngine();
    events = [];
    engine.onEvent((event) => events.push(event));

    for (const [index, price] of [0.5, 0.51, 0.52].entries()) {
      engine.submitOrder({
        pair: 'XLM/USD',
        side: 'sell',
        type: 'limit',
        price,
        quantity: 10,
        clientId: `maker-${index}`,
      });
    }
    events.length = 0;
  });

  it('emits one lifecycle event per maker the sweep touched', () => {
    engine.submitOrder({
      pair: 'XLM/USD',
      side: 'buy',
      type: 'market',
      price: 0.5,
      quantity: 25,
      clientId: 'taker',
    });

    expect(events.map((e) => e.type)).toEqual([
      'order_accepted',
      'order_filled',
      'order_filled',
      'order_partial_fill',
      'order_filled',
    ]);
  });

  it('never emits a zero-quantity fill event during a sweep', () => {
    engine.submitOrder({
      pair: 'XLM/USD',
      side: 'buy',
      type: 'market',
      price: 0.5,
      quantity: 25,
      clientId: 'taker',
    });

    const fills = events.filter((e) => e.type !== 'order_accepted');
    expect(fills.length).toBeGreaterThan(0);
    for (const event of fills) {
      expect(event.quantity).toBeGreaterThan(0);
    }
  });
});