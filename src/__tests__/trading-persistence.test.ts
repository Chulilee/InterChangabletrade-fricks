import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TradingEngine } from '@/lib/trading-engine';
import {
  InMemoryTradingPersistence,
  FileTradingPersistence,
  createTradingPersistenceFromEnv,
} from '@/lib/trading-persistence';

describe('trading engine persistence', () => {
  it('restores the order book, order status and trade history across a restart', () => {
    const persistence = new InMemoryTradingPersistence();

    const first = new TradingEngine(persistence);
    const maker = first.submitOrder({
      pair: 'BTC/USDT',
      side: 'sell',
      type: 'limit',
      price: 50_000,
      quantity: 1,
      clientId: 'maker-client',
    });
    first.submitOrder({
      pair: 'BTC/USDT',
      side: 'buy',
      type: 'limit',
      price: 49_000,
      quantity: 2,
      clientId: 'resting-buy-client',
    });
    const taker = first.submitOrder({
      pair: 'BTC/USDT',
      side: 'buy',
      type: 'limit',
      price: 50_000,
      quantity: 0.5,
      clientId: 'taker-client',
    });
    expect(maker).not.toBeNull();
    expect(taker).not.toBeNull();

    // "Restart": a fresh engine over the same backend sees the prior state.
    const revived = new TradingEngine(persistence);

    // Order book survives: the half-filled ask and the resting bid are back.
    const book = revived.getOrderBook('BTC/USDT');
    expect(book.asks).toHaveLength(1);
    expect(book.asks[0].price).toBe(50_000);
    expect(book.asks[0].remainingQuantity).toBeCloseTo(0.5, 8);
    expect(book.bids).toHaveLength(1);
    expect(book.bids[0].price).toBe(49_000);

    // Order statuses survive.
    expect(revived.getOrderStatus(taker!.id)?.status).toBe('filled');
    expect(revived.getOrderStatus(maker!.id)?.status).toBe('partial_fill');

    // Trade history is preserved.
    const trades = revived.getTrades('BTC/USDT');
    expect(trades.total).toBe(1);
    expect(trades.trades[0].quantity).toBeCloseTo(0.5, 8);

    // Client order index is rebuilt so per-client queries keep working.
    const takerOrders = revived.getOrdersByClient('taker-client');
    expect(takerOrders.total).toBe(1);
  });

  it('round-trips through the file backend', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ict-engine-state-'));
    const filePath = path.join(directory, 'state.json');
    const persistence = new FileTradingPersistence(filePath);

    const first = new TradingEngine(persistence);
    const order = first.submitOrder({
      pair: 'ETH/USDT',
      side: 'sell',
      type: 'limit',
      price: 3_000,
      quantity: 1.5,
      clientId: 'file-maker',
    });
    expect(order).not.toBeNull();
    expect(fs.existsSync(filePath)).toBe(true);

    const revived = new TradingEngine(new FileTradingPersistence(filePath));
    expect(revived.getOrderStatus(order!.id)?.status).toBe('open');
    expect(revived.getOrderBook('ETH/USDT').asks).toHaveLength(1);

    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('honours a cleared or missing snapshot by starting empty', () => {
    const persistence = new InMemoryTradingPersistence();
    expect(persistence.load()).toBeNull();

    const engine = new TradingEngine(persistence);
    expect(engine.getOrderBook('BTC/USDT').asks).toHaveLength(0);
  });

  it('selects backends from the environment', () => {
    expect(createTradingPersistenceFromEnv({ TRADING_PERSISTENCE: 'none' })).toBeNull();
    expect(
      createTradingPersistenceFromEnv({ TRADING_PERSISTENCE: 'memory' }),
    ).toBeInstanceOf(InMemoryTradingPersistence);
    expect(
      createTradingPersistenceFromEnv({
        TRADING_PERSISTENCE: 'file',
        TRADING_STATE_PATH: path.join(os.tmpdir(), 'ict-env-state-test.json'),
      }),
    ).toBeInstanceOf(FileTradingPersistence);
    // Under NODE_ENV=test the default is no persistence, keeping tests hermetic.
    expect(createTradingPersistenceFromEnv({ NODE_ENV: 'test' })).toBeNull();
  });
});
