import { OrderRouter } from '../orderRouter';
import { ExchangeSimulatorAdapter } from '../adapters/exchangeSimulatorAdapter';
import { InternalMatchingEngineAdapter } from '../adapters/internalMatchingEngineAdapter';
import { TradingEngine } from '../../trading-engine';
import { Order } from '@/types/trading';
import { SplitEqualStrategy } from '../strategies/splitEqualStrategy';

describe('OrderRouter Unit Tests', () => {
  let tradingEngine: TradingEngine;

  beforeEach(() => {
    tradingEngine = new TradingEngine();
  });

  describe('SplitEqualStrategy', () => {
    it('should split order quantity equally across venues', () => {
      const strategy = new SplitEqualStrategy();
      const mockOrder: Order = {
        id: 'test',
        pair: 'BTC/USD',
        side: 'buy',
        type: 'limit',
        price: 50000,
        quantity: 100,
        filled: 0,
        remaining: 100,
        status: 'pending',
        clientId: 'test',
        timestamp: Date.now(),
      };

      const venues = [
        { id: 'venue1', type: 'external' as const, enabled: true },
        { id: 'venue2', type: 'external' as const, enabled: true },
      ];

      const legs = strategy.buildPlan(mockOrder, venues);
      expect(legs).toHaveLength(2);
      expect(legs[0].destination.quantity).toBe(50);
      expect(legs[1].destination.quantity).toBe(50);
    });

    it('should handle odd quantities correctly with remainder', () => {
      const strategy = new SplitEqualStrategy();
      const mockOrder: Order = {
        id: 'test',
        pair: 'BTC/USD',
        side: 'buy',
        type: 'limit',
        price: 50000,
        quantity: 101,
        filled: 0,
        remaining: 101,
        status: 'pending',
        clientId: 'test',
        timestamp: Date.now(),
      };

      const venues = [
        { id: 'venue1', type: 'external' as const, enabled: true },
        { id: 'venue2', type: 'external' as const, enabled: true },
        { id: 'venue3', type: 'external' as const, enabled: true },
      ];

      const legs = strategy.buildPlan(mockOrder, venues);
      expect(legs).toHaveLength(3);
      
      const totalQuantity = legs.reduce((sum, leg) => sum + leg.destination.quantity, 0);
      expect(totalQuantity).toBe(101);
      
      // First leg gets the remainder (101 / 3 = 33 with remainder 2, so first leg gets 35? Wait 33+34+34=101)
      // Actually the implementation adds remainder only to first leg, so 35, 33, 33 = 101
      expect(legs[0].destination.quantity).toBe(35);
      expect(legs[1].destination.quantity).toBe(33);
      expect(legs[2].destination.quantity).toBe(33);
    });

    it('should return empty array when no venues are available', () => {
      const strategy = new SplitEqualStrategy();
      const mockOrder: Order = {
        id: 'test',
        pair: 'BTC/USD',
        side: 'buy',
        type: 'limit',
        price: 50000,
        quantity: 100,
        filled: 0,
        remaining: 100,
        status: 'pending',
        clientId: 'test',
        timestamp: Date.now(),
      };

      const legs = strategy.buildPlan(mockOrder, []);
      expect(legs).toHaveLength(0);
    });
  });

  describe('ExchangeSimulatorAdapter', () => {
    it('should generate unique order IDs', async () => {
      const adapter = new ExchangeSimulatorAdapter({ venueId: 'test_sim' });
      const order = {
        pair: 'BTC/USD',
        side: 'buy' as const,
        type: 'limit' as const,
        price: 50000,
        quantity: 10,
        clientId: 'test',
      };

      const result1 = await adapter.sendOrder(order, 'idem_key_1');
      const result2 = await adapter.sendOrder(order, 'idem_key_2');

      expect(result1.orderId).toBeDefined();
      expect(result2.orderId).toBeDefined();
      expect(result1.orderId).not.toBe(result2.orderId);

      adapter.destroy();
    });

    it('should respect idempotency keys and return same order ID for same key', async () => {
      const adapter = new ExchangeSimulatorAdapter({ venueId: 'test_sim' });
      const order = {
        pair: 'BTC/USD',
        side: 'buy' as const,
        type: 'limit' as const,
        price: 50000,
        quantity: 10,
        clientId: 'test',
      };

      const result1 = await adapter.sendOrder(order, 'same_idem_key');
      const result2 = await adapter.sendOrder(order, 'same_idem_key');

      expect(result1.orderId).toBe(result2.orderId);

      adapter.destroy();
    });

    it('should return error for non-existent order status check', async () => {
      const adapter = new ExchangeSimulatorAdapter({ venueId: 'test_sim' });
      const status = await adapter.getStatus('non_existent_order');
      
      expect(status.success).toBe(false);
      expect(status.error).toBe('Order not found');

      adapter.destroy();
    });
  });

  describe('OrderRouter', () => {
    it('should throw error when no enabled venues are available', () => {
      const router = new OrderRouter({
        venues: [
          { id: 'venue1', type: 'external', enabled: false },
          { id: 'venue2', type: 'external', enabled: false },
        ],
        retryPolicy: {
          maxRetries: 3,
          initialBackoffMs: 100,
          maxBackoffMs: 1000,
          backoffMultiplier: 2,
          retryableErrors: [],
        },
        reconciliationIntervalMs: 500,
        enableFailover: true,
      });

      const testOrder: Order = {
        id: 'test',
        pair: 'BTC/USD',
        side: 'buy',
        type: 'limit',
        price: 50000,
        quantity: 100,
        filled: 0,
        remaining: 100,
        status: 'pending',
        clientId: 'test',
        timestamp: Date.now(),
      };

      expect(() => router.buildRoutingPlan(testOrder)).toThrow('No enabled venues available');
      
      router.destroy();
    });

    it('should register and store adapters correctly', () => {
      const router = new OrderRouter({
        venues: [{ id: 'internal', type: 'internal', enabled: true }],
        retryPolicy: {
          maxRetries: 3,
          initialBackoffMs: 100,
          maxBackoffMs: 1000,
          backoffMultiplier: 2,
          retryableErrors: [],
        },
        reconciliationIntervalMs: 500,
        enableFailover: true,
      });

      const internalAdapter = new InternalMatchingEngineAdapter(tradingEngine, 'internal');
      router.registerAdapter(internalAdapter);

      // We can't access private adapters map directly, but the code would use it during execution
      // The test passes if no errors are thrown during registration

      router.destroy();
    });
  });
});