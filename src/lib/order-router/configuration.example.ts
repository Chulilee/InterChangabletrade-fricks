/**
 * Example configuration and usage of the order routing layer
 * This file demonstrates how to set up the router with multiple venues
 */

import { OrderRouter } from './orderRouter';
import { ExchangeSimulatorAdapter } from './adapters/exchangeSimulatorAdapter';
import { InternalMatchingEngineAdapter } from './adapters/internalMatchingEngineAdapter';
import { TradingEngine } from '../trading-engine';
import { Order } from '@/types/trading';

/**
 * Example: Create and configure the order router
 */
export function setupOrderRouter(tradingEngine: TradingEngine): OrderRouter {
  // 1. Create venue adapters
  const internalAdapter = new InternalMatchingEngineAdapter(tradingEngine, 'internal_main');
  
  // Create multiple exchange simulators (would be real exchange adapters in production)
  const binanceAdapter = new ExchangeSimulatorAdapter({
    venueId: 'binance',
    failureRate: 0.02, // 2% failure rate in production simulation
    fillProbability: 0.85,
    partialFillProbability: 0.6,
    minFillDelayMs: 50,
    maxFillDelayMs: 1500,
  });

  const coinbaseAdapter = new ExchangeSimulatorAdapter({
    venueId: 'coinbase',
    failureRate: 0.03,
    fillProbability: 0.82,
    partialFillProbability: 0.55,
    minFillDelayMs: 75,
    maxFillDelayMs: 1800,
  });

  const krakenAdapter = new ExchangeSimulatorAdapter({
    venueId: 'kraken',
    failureRate: 0.04,
    fillProbability: 0.80,
    partialFillProbability: 0.5,
    minFillDelayMs: 100,
    maxFillDelayMs: 2000,
  });

  // 2. Configure the router
  const router = new OrderRouter({
    // Define all available venues with weights for allocation
    venues: [
      { 
        id: 'internal_main', 
        type: 'internal', 
        enabled: true, 
        weight: 0.4, // 40% to internal matching engine
        maxAllocation: 1000, // Max 1000 units to internal at once
      },
      { 
        id: 'binance', 
        type: 'external', 
        enabled: true, 
        weight: 0.3, // 30% to Binance
        maxAllocation: 5000,
      },
      { 
        id: 'coinbase', 
        type: 'external', 
        enabled: true, 
        weight: 0.2, // 20% to Coinbase
        maxAllocation: 3000,
      },
      { 
        id: 'kraken', 
        type: 'external', 
        enabled: true, 
        weight: 0.1, // 10% to Kraken
        maxAllocation: 2000,
      },
    ],
    
    // Retry policy for failed operations
    retryPolicy: {
      maxRetries: 5,
      initialBackoffMs: 100,
      maxBackoffMs: 5000,
      backoffMultiplier: 1.5,
      retryableErrors: [
        'network_timeout',
        'rate_limit',
        'service_unavailable',
        'gateway_timeout',
        'Simulated exchange failure',
      ],
    },
    
    // Reconciliation configuration
    reconciliationIntervalMs: 1000, // Check external orders every second
    enableFailover: true, // Automatically failover to other venues if one fails
  });

  // 3. Register all adapters with the router
  router.registerAdapter(internalAdapter);
  router.registerAdapter(binanceAdapter);
  router.registerAdapter(coinbaseAdapter);
  router.registerAdapter(krakenAdapter);

  // 4. Subscribe to router events for monitoring
  router.onEvent((event) => {
    console.log(`[Router Event] ${event.type} for order ${event.orderId} (plan: ${event.planId})`);
    console.log(`  Filled: ${event.quantity}, Remaining: ${event.remaining}`);
    
    // Send to monitoring/analytics in production
    // trackMetric('router.order_event', { eventType: event.type, venue: event.legId });
  });

  return router;
}

/**
 * Example usage: Submit a large order that gets routed across multiple venues
 */
export async function submitLargeOrder(router: OrderRouter) {
  // Create a large buy order for BTC
  const largeOrder: Order = {
    id: `order_${Date.now()}`,
    pair: 'BTC/USD',
    side: 'buy',
    type: 'limit',
    price: 67500, // Buy BTC at $67,500
    quantity: 50, // Buy 50 BTC - will be split across venues
    filled: 0,
    remaining: 50,
    status: 'pending',
    clientId: 'institutional_client_123',
    timestamp: Date.now(),
  };

  try {
    // Build the routing plan
    const plan = router.buildRoutingPlan(largeOrder);
    console.log(`Created routing plan: ${plan.planId} with ${plan.legs.length} legs`);
    
    // Log how the order was split
    plan.legs.forEach((leg, index) => {
      console.log(`  Leg ${index + 1}: ${leg.destination.quantity} BTC to ${leg.destination.venueId}`);
    });

    // Execute the plan
    const result = await router.executePlan(plan);
    
    if (result.success) {
      console.log(`Plan ${result.planId} submitted successfully`);
      
      // Monitor the plan's progress
      const checkCompletion = setInterval(() => {
        const currentPlan = router.getPlan(result.planId);
        if (!currentPlan) return;

        console.log(`Plan status: ${currentPlan.status}, Total filled: ${currentPlan.totalFilled}/50 BTC`);
        
        if (currentPlan.status === 'complete' || currentPlan.status === 'failed') {
          clearInterval(checkCompletion);
          console.log('Plan execution finished');
          console.log(`Final status: ${currentPlan.status}`);
          console.log(`Total filled: ${currentPlan.totalFilled} BTC`);
        }
      }, 2000);
    } else {
      console.error(`Plan execution failed: ${result.errors?.join(', ')}`);
    }
  } catch (error) {
    console.error('Failed to process order:', error);
  }
}

/**
 * Example: Adding a new venue adapter
 */
export function addNewVenue(router: OrderRouter) {
  // Create a new exchange adapter (e.g., for a new exchange like OKX)
  const okxAdapter = new ExchangeSimulatorAdapter({
    venueId: 'okx',
    failureRate: 0.03,
    fillProbability: 0.83,
    partialFillProbability: 0.58,
  });

  // Register the adapter
  router.registerAdapter(okxAdapter);
  
  // To enable it, you would update the router's config or create a new router
  // In a real implementation, you could have dynamic venue management
  console.log('Added new venue: okx');
}

const orderRouterExamples = { setupOrderRouter, submitLargeOrder, addNewVenue };
export default orderRouterExamples;