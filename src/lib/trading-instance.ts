import { TradingEngine } from './trading-engine';

// Singleton instance of the TradingEngine to maintain state across API requests
let tradingEngine: TradingEngine | null = null;

export function getTradingEngine(): TradingEngine {
  if (!tradingEngine) {
    tradingEngine = new TradingEngine();
  }
  return tradingEngine;
}

// Reset the singleton. Used by tests to isolate engine state between cases;
// not used by the running application.
export function resetTradingEngine(): void {
  tradingEngine = null;
}