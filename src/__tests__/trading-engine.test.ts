import { TradingEngine } from '@/lib/trading-engine';
import { TradeEvent } from '@/types/trading';

describe('TradingEngine', () => {
  let engine: TradingEngine;
  let events: TradeEvent[];

  beforeEach(() => {
    engine = new TradingEngine();
    events = [];
    engine.onEvent((event) => events.push(event));
  });

  describe('submitOrder', () => {
    it('should accept a valid limit order', () => {
      const order = engine.submitOrder({
        pair: 'XLM/USD',
        side: 'buy',
        type: 'limit',
        price: 0.5,
        quantity: 100,
        clientId: 'client1',
      });

      expect(order).not.toBeNull();
      expect(order?.status).toBe('open');
      expect(order?.remaining).toBe(100);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('order_accepted');
    });

    it('should reject invalid order parameters', () => {
      const order = engine.submitOrder({
        pair: '',
        side: 'buy',
        type: 'limit',
        price: 0.5,
        quantity: 100,
        clientId: 'client1',
      });

      expect(order).toBeNull();
    });

    it('should match buy order with existing sell order', () => {
      engine.submitOrder({
        pair: 'XLM/USD',
        side: 'sell',
        type: 'limit',
        price: 0.5,
        quantity: 100,
        clientId: 'maker',
      });

      const buyOrder = engine.submitOrder({
        pair: 'XLM/USD',
        side: 'buy',
        type: 'limit',
        price: 0.5,
        quantity: 50,
        clientId: 'taker',
      });

      expect(buyOrder?.status).toBe('filled');
      expect(buyOrder?.filled).toBe(50);
      expect(buyOrder?.remaining).toBe(0);
    });

    it('should handle partial fills', () => {
      engine.submitOrder({
        pair: 'XLM/USD',
        side: 'sell',
        type: 'limit',
        price: 0.5,
        quantity: 100,
        clientId: 'maker',
      });

      const buyOrder = engine.submitOrder({
        pair: 'XLM/USD',
        side: 'buy',
        type: 'limit',
        price: 0.5,
        quantity: 150,
        clientId: 'taker',
      });

      expect(buyOrder?.status).toBe('partial_fill');
      expect(buyOrder?.filled).toBe(100);
      expect(buyOrder?.remaining).toBe(50);
    });

    it('should execute market orders immediately', () => {
      engine.submitOrder({
        pair: 'XLM/USD',
        side: 'sell',
        type: 'limit',
        price: 0.5,
        quantity: 100,
        clientId: 'maker',
      });

      const marketOrder = engine.submitOrder({
        pair: 'XLM/USD',
        side: 'buy',
        type: 'market',
        price: 0.5,
        quantity: 50,
        clientId: 'taker',
      });

      expect(marketOrder?.status).toBe('filled');
    });
  });

  describe('cancelOrder', () => {
    it('should cancel an open order', () => {
      const order = engine.submitOrder({
        pair: 'XLM/USD',
        side: 'buy',
        type: 'limit',
        price: 0.5,
        quantity: 100,
        clientId: 'client1',
      });

      const result = engine.cancelOrder(order!.id);
      expect(result).toBe(true);

      const status = engine.getOrderStatus(order!.id);
      expect(status?.status).toBe('cancelled');
    });

    it('should not cancel a filled order', () => {
      engine.submitOrder({
        pair: 'XLM/USD',
        side: 'sell',
        type: 'limit',
        price: 0.5,
        quantity: 100,
        clientId: 'maker',
      });

      const buyOrder = engine.submitOrder({
        pair: 'XLM/USD',
        side: 'buy',
        type: 'limit',
        price: 0.5,
        quantity: 100,
        clientId: 'taker',
      });

      const result = engine.cancelOrder(buyOrder!.id);
      expect(result).toBe(false);
    });

    it('should return false for non-existent order', () => {
      const result = engine.cancelOrder('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('getOrderBook', () => {
    it('should return correct order book', () => {
      engine.submitOrder({
        pair: 'XLM/USD',
        side: 'buy',
        type: 'limit',
        price: 0.49,
        quantity: 100,
        clientId: 'bidder1',
      });

      engine.submitOrder({
        pair: 'XLM/USD',
        side: 'buy',
        type: 'limit',
        price: 0.48,
        quantity: 200,
        clientId: 'bidder2',
      });

      engine.submitOrder({
        pair: 'XLM/USD',
        side: 'sell',
        type: 'limit',
        price: 0.51,
        quantity: 150,
        clientId: 'asker1',
      });

      const orderBook = engine.getOrderBook('XLM/USD');

      expect(orderBook.bids).toHaveLength(2);
      expect(orderBook.asks).toHaveLength(1);
      expect(orderBook.bids[0].price).toBe(0.49);
      expect(orderBook.asks[0].price).toBe(0.51);
    });
  });

  describe('event emission', () => {
    it('should emit events for order lifecycle', () => {
      engine.submitOrder({
        pair: 'XLM/USD',
        side: 'sell',
        type: 'limit',
        price: 0.5,
        quantity: 100,
        clientId: 'maker',
      });

      engine.submitOrder({
        pair: 'XLM/USD',
        side: 'buy',
        type: 'limit',
        price: 0.5,
        quantity: 100,
        clientId: 'taker',
      });

      expect(events).toHaveLength(4);
      expect(events[0].type).toBe('order_accepted');
      expect(events[1].type).toBe('order_accepted');
      // A full match fills both sides: the resting order first, then the incoming order.
      expect(events[2].type).toBe('order_filled');
      expect(events[3].type).toBe('order_filled');
    });

    it('should emit cancel event', () => {
      const order = engine.submitOrder({
        pair: 'XLM/USD',
        side: 'buy',
        type: 'limit',
        price: 0.5,
        quantity: 100,
        clientId: 'client1',
      });

      engine.cancelOrder(order!.id);

      expect(events).toHaveLength(2);
      expect(events[1].type).toBe('order_cancelled');
    });
  });

  describe('rate limiting', () => {
    it('should enforce rate limits', () => {
      for (let i = 0; i < 100; i++) {
        engine.submitOrder({
          pair: 'XLM/USD',
          side: 'buy',
          type: 'limit',
          price: 0.5,
          quantity: 1,
          clientId: 'rate-limited-client',
        });
      }

      const order = engine.submitOrder({
        pair: 'XLM/USD',
        side: 'buy',
        type: 'limit',
        price: 0.5,
        quantity: 1,
        clientId: 'rate-limited-client',
      });

      expect(order).toBeNull();
    });
  });

  describe('concurrency', () => {
    it('should handle concurrent order submissions', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          Promise.resolve(
            engine.submitOrder({
              pair: 'XLM/USD',
              side: 'buy',
              type: 'limit',
              price: 0.5,
              quantity: 10,
              clientId: `client-${i}`,
            }),
          ),
        );
      }

      const orders = await Promise.all(promises);
      expect(orders.every((o) => o !== null)).toBe(true);

      const orderBook = engine.getOrderBook('XLM/USD');
      // All 10 orders rest at the same price, so the book aggregates them into
      // a single level: one entry, 10 orders, 100 total quantity.
      expect(orderBook.bids).toHaveLength(1);
      expect(orderBook.bids[0].orderCount).toBe(10);
      expect(orderBook.bids[0].quantity).toBe(100);
    });
  });
});
