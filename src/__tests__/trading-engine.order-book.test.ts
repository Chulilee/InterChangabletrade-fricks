import { TradingEngine } from '@/lib/trading-engine';

/**
 * Order book depth for partially filled orders.
 *
 * A level used to sum each order's `remaining`, which is the unfilled tail
 * rather than its size. A partially filled order therefore reported less than
 * was ordered at its price, and less again with every subsequent fill, so the
 * book could not be reconciled against the orders that produced it.
 */
describe('TradingEngine order book depth', () => {
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

  /** Partially fill the single resting ask and return it. */
  function restAskAndPartiallyFill(quantity = 100, fill = 40) {
    submit('sell', 0.5, quantity, 'maker');
    submit('buy', 0.5, fill, 'taker', 'market');
    return engine.getOrderBook('XLM/USD').asks[0];
  }

  it('reports the full original size for a partially filled order', () => {
    const level = restAskAndPartiallyFill(100, 40);

    expect(level.price).toBe(0.5);
    expect(level.quantity).toBe(100);
    expect(level.orderCount).toBe(1);
  });

  it('reports the unfilled tail separately from the ordered size', () => {
    const level = restAskAndPartiallyFill(100, 40);

    expect(level.quantity).toBe(100);
    expect(level.remainingQuantity).toBe(60);
  });

  it('keeps the ordered size stable while further fills land', () => {
    submit('sell', 0.5, 100, 'maker');

    submit('buy', 0.5, 40, 'taker-1', 'market');
    expect(engine.getOrderBook('XLM/USD').asks[0]).toMatchObject({
      quantity: 100,
      remainingQuantity: 60,
    });

    submit('buy', 0.5, 10, 'taker-2', 'market');
    expect(engine.getOrderBook('XLM/USD').asks[0]).toMatchObject({
      quantity: 100,
      remainingQuantity: 50,
    });

    submit('buy', 0.5, 20, 'taker-3', 'market');
    expect(engine.getOrderBook('XLM/USD').asks[0]).toMatchObject({
      quantity: 100,
      remainingQuantity: 30,
    });
  });

  it('sums original sizes and unfilled tails across orders at one level', () => {
    submit('sell', 0.5, 100, 'maker-a');
    submit('sell', 0.5, 50, 'maker-b');
    submit('buy', 0.5, 40, 'taker', 'market');

    const level = engine.getOrderBook('XLM/USD').asks[0];

    expect(level.quantity).toBe(150);
    expect(level.remainingQuantity).toBe(110);
    expect(level.orderCount).toBe(2);
  });

  it('reports a partially filled bid the same way as an ask', () => {
    submit('buy', 0.49, 200, 'maker');
    submit('sell', 0.49, 75, 'taker', 'market');

    const level = engine.getOrderBook('XLM/USD').bids[0];

    expect(level).toMatchObject({
      price: 0.49,
      quantity: 200,
      remainingQuantity: 125,
      orderCount: 1,
    });
  });

  it('leaves an unfilled book unchanged', () => {
    submit('buy', 0.49, 100, 'bidder-1');
    submit('buy', 0.48, 200, 'bidder-2');
    submit('sell', 0.51, 150, 'asker-1');

    const book = engine.getOrderBook('XLM/USD');

    // Nothing has traded, so the ordered size and the unfilled tail agree.
    expect(book.bids[0]).toMatchObject({
      price: 0.49,
      quantity: 100,
      remainingQuantity: 100,
      orderCount: 1,
    });
    expect(book.asks[0]).toMatchObject({
      price: 0.51,
      quantity: 150,
      remainingQuantity: 150,
      orderCount: 1,
    });
  });

  it('drops a fully filled order out of the level entirely', () => {
    submit('sell', 0.5, 40, 'maker');
    submit('buy', 0.5, 40, 'taker', 'market');

    expect(engine.getOrderBook('XLM/USD').asks).toEqual([]);
  });

  it('applies depth after aggregating, so a partial fill does not lose a level', () => {
    submit('buy', 0.49, 100, 'bidder-1');
    submit('buy', 0.48, 200, 'bidder-2');
    submit('buy', 0.47, 300, 'bidder-3');
    submit('sell', 0.49, 50, 'taker', 'market');

    const book = engine.getOrderBook('XLM/USD', 2);

    expect(book.bids).toHaveLength(2);
    expect(book.bids[0]).toMatchObject({
      price: 0.49,
      quantity: 100,
      remainingQuantity: 50,
    });
    expect(book.bids[1]).toMatchObject({
      price: 0.48,
      quantity: 200,
      remainingQuantity: 200,
    });
  });

  it('keeps bid and ask sides independent when both are partially filled', () => {
    submit('buy', 0.49, 100, 'bid-maker');
    submit('sell', 0.51, 200, 'ask-maker');

    // Sell into the bid, then buy into the ask.
    submit('sell', 0.49, 30, 'sell-taker', 'market');
    submit('buy', 0.51, 70, 'buy-taker', 'market');

    const book = engine.getOrderBook('XLM/USD');

    expect(book.bids[0]).toMatchObject({
      price: 0.49,
      quantity: 100,
      remainingQuantity: 70,
    });
    expect(book.asks[0]).toMatchObject({
      price: 0.51,
      quantity: 200,
      remainingQuantity: 130,
    });
  });

  it('returns an empty book for a pair with no resting orders', () => {
    submit('buy', 0.49, 100, 'bidder', 'market');

    expect(engine.getOrderBook('BTC/USDT')).toMatchObject({
      pair: 'BTC/USDT',
      bids: [],
      asks: [],
    });
  });
});