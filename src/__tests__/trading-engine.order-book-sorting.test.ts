import { TradingEngine } from '@/lib/trading-engine';

/**
 * Order book price-level sorting.
 *
 * The displayed book must read like a real market: bid levels strictly
 * descending from the best (highest) price, ask levels strictly ascending
 * from the best (lowest) price, with depth truncation applied to the best
 * levels only. The existing order-book suite covers aggregation semantics;
 * this file pins down the sort contract itself, including unsorted insertion
 * order and interleaved sides.
 */
describe('TradingEngine order book sorting', () => {
  let engine: TradingEngine;

  beforeEach(() => {
    engine = new TradingEngine();
  });

  function submit(
    side: 'buy' | 'sell',
    price: number,
    quantity: number,
    clientId: string,
    type: 'limit' | 'market' = 'limit',
  ) {
    return engine.submitOrder({
      pair: 'XLM/USD',
      side,
      type,
      price,
      quantity,
      clientId,
    });
  }

  it('returns bid levels strictly highest price first', () => {
    // Insert deliberately out of order.
    submit('buy', 0.47, 100, 'bid-c');
    submit('buy', 0.49, 100, 'bid-a');
    submit('buy', 0.48, 100, 'bid-b');
    submit('buy', 0.45, 100, 'bid-e');
    submit('buy', 0.46, 100, 'bid-d');

    const book = engine.getOrderBook('XLM/USD');

    expect(book.bids.map((level) => level.price)).toEqual([0.49, 0.48, 0.47, 0.46, 0.45]);
  });

  it('returns ask levels strictly lowest price first', () => {
    // Insert deliberately out of order.
    submit('sell', 0.55, 100, 'ask-c');
    submit('sell', 0.51, 100, 'ask-a');
    submit('sell', 0.54, 100, 'ask-b');
    submit('sell', 0.52, 100, 'ask-d');
    submit('sell', 0.53, 100, 'ask-e');

    const book = engine.getOrderBook('XLM/USD');

    expect(book.asks.map((level) => level.price)).toEqual([0.51, 0.52, 0.53, 0.54, 0.55]);
  });

  it('keeps the sides independent: interleaved insertion still sorts each side', () => {
    submit('sell', 0.52, 100, 'ask-b');
    submit('buy', 0.48, 100, 'bid-b');
    submit('sell', 0.51, 100, 'ask-a');
    submit('buy', 0.49, 100, 'bid-a');
    submit('buy', 0.47, 100, 'bid-c');
    submit('sell', 0.53, 100, 'ask-c');

    const book = engine.getOrderBook('XLM/USD');

    expect(book.bids.map((level) => level.price)).toEqual([0.49, 0.48, 0.47]);
    expect(book.asks.map((level) => level.price)).toEqual([0.51, 0.52, 0.53]);
  });

  it('sorts aggregated levels (not just individual orders) across prices', () => {
    // Multiple orders at the same price, inserted around other prices.
    submit('buy', 0.47, 100, 'bid-c1');
    submit('buy', 0.49, 50, 'bid-a1');
    submit('buy', 0.48, 100, 'bid-b1');
    submit('buy', 0.49, 150, 'bid-a2');
    submit('buy', 0.48, 25, 'bid-b2');
    submit('sell', 0.53, 100, 'ask-b1');
    submit('sell', 0.51, 100, 'ask-a1');
    submit('sell', 0.52, 100, 'ask-b2');
    submit('sell', 0.51, 100, 'ask-a2');

    const book = engine.getOrderBook('XLM/USD');

    expect(book.bids.map((level) => level.price)).toEqual([0.49, 0.48, 0.47]);
    expect(book.asks.map((level) => level.price)).toEqual([0.51, 0.52, 0.53]);
    expect(book.bids[0]).toMatchObject({ price: 0.49, orderCount: 2, quantity: 200 });
    expect(book.bids[1]).toMatchObject({ price: 0.48, orderCount: 2, quantity: 125 });
    expect(book.asks[0]).toMatchObject({ price: 0.51, orderCount: 2, quantity: 200 });
  });

  it('applies depth after sorting, so the best levels survive truncation', () => {
    submit('buy', 0.45, 100, 'bid-e');
    submit('buy', 0.49, 100, 'bid-a');
    submit('buy', 0.47, 100, 'bid-c');
    submit('buy', 0.48, 100, 'bid-b');
    submit('buy', 0.46, 100, 'bid-d');
    submit('sell', 0.55, 100, 'ask-e');
    submit('sell', 0.51, 100, 'ask-a');
    submit('sell', 0.53, 100, 'ask-c');
    submit('sell', 0.52, 100, 'ask-b');
    submit('sell', 0.54, 100, 'ask-d');

    const book = engine.getOrderBook('XLM/USD', 3);

    expect(book.bids.map((level) => level.price)).toEqual([0.49, 0.48, 0.47]);
    expect(book.asks.map((level) => level.price)).toEqual([0.51, 0.52, 0.53]);
  });

  it('sorting remains correct after a middle resting order is filled and drops out', () => {
    submit('buy', 0.49, 100, 'bid-a');
    submit('buy', 0.48, 100, 'bid-b');
    submit('buy', 0.47, 100, 'bid-c');
    submit('sell', 0.51, 100, 'ask-a');
    submit('sell', 0.52, 100, 'ask-b');

    // Fill the best bid level completely; it must disappear from the book.
    submit('sell', 0.49, 100, 'taker', 'market');

    const book = engine.getOrderBook('XLM/USD');
    expect(book.bids.map((level) => level.price)).toEqual([0.48, 0.47]);
    expect(book.asks.map((level) => level.price)).toEqual([0.51, 0.52]);
  });

  it('market orders do not enter the sorted book', () => {
    submit('buy', 0.5, 100, 'bid-a');
    submit('buy', 0.5, 50, 'market-buyer', 'market');
    submit('sell', 0.53, 100, 'ask-a');
    submit('sell', 0.53, 50, 'market-seller', 'market');

    const book = engine.getOrderBook('XLM/USD');

    expect(book.bids.map((level) => level.price)).toEqual([0.5]);
    expect(book.asks.map((level) => level.price)).toEqual([0.53]);
  });

  it('returns an empty, sorted-by-construction book for an untouched pair', () => {
    const book = engine.getOrderBook('BTC/USDT');

    expect(book.bids).toEqual([]);
    expect(book.asks).toEqual([]);
  });
});
