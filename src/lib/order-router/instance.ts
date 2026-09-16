import { OrderRouter } from './orderRouter';
import { InternalMatchingEngineAdapter } from './adapters/internalMatchingEngineAdapter';
import type { TradingEngine } from '@/lib/trading-engine';

/**
 * Process-wide OrderRouter wired to the internal matching engine.
 *
 * Cached against the exact TradingEngine instance it routes to, so a
 * `resetTradingEngine()` (tests) naturally rebuilds the router against the
 * fresh engine instead of silently submitting into the old one.
 */
let cached: { engine: TradingEngine; router: OrderRouter } | null = null;

export function getOrderRouter(engine: TradingEngine): OrderRouter {
  if (!cached || cached.engine !== engine) {
    cached?.router.destroy();

    const router = new OrderRouter({
      // Single internal venue today; external simulators plug in here.
      venues: [
        { id: 'internal_main', type: 'internal', enabled: true, weight: 1 },
      ],
      retryPolicy: {
        maxRetries: 3,
        initialBackoffMs: 100,
        maxBackoffMs: 2000,
        backoffMultiplier: 2,
        retryableErrors: ['network_timeout', 'rate_limit', 'service_unavailable'],
      },
      // No external venues yet, so the reconciliation loop has nothing to
      // poll — keep it cheap.
      reconciliationIntervalMs: 30_000,
      enableFailover: false,
    });

    router.registerAdapter(new InternalMatchingEngineAdapter(engine, 'internal_main'));
    cached = { engine, router };
  }
  return cached.router;
}

export function resetOrderRouter(): void {
  cached?.router.destroy();
  cached = null;
}
