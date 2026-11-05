import { TradingEngine } from './trading-engine';
import { createTradingPersistenceFromEnv } from './trading-persistence';
import { resetOrderRouter } from './order-router/instance';

// Singleton instance of the TradingEngine to maintain state across API requests
let tradingEngine: TradingEngine | null = null;

export function getTradingEngine(): TradingEngine {
  if (!tradingEngine) {
    // Restore from (and persist to) the configured backend so the order
    // book, trade history and open orders survive a restart. Configure with
    // TRADING_PERSISTENCE=file|memory|none and TRADING_STATE_PATH.
    tradingEngine = new TradingEngine(createTradingPersistenceFromEnv());
  }
  return tradingEngine;
}

// Reset the singleton. Used by tests to isolate engine state between cases;
// not used by the running application.
export function resetTradingEngine(): void {
  resetOrderRouter();
  tradingEngine = null;
}