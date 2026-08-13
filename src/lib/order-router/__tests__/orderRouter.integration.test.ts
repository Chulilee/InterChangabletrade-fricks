import { OrderRouter } from '../orderRouter';
import { ExchangeSimulatorAdapter } from '../adapters/exchangeSimulatorAdapter';
import { InternalMatchingEngineAdapter } from '../adapters/internalMatchingEngineAdapter';
import { TradingEngine } from '../../trading-engine';
import { Order } from '@/types/trading';

describe('OrderRouter Integration Tests', () => {
  let tradingEngine: TradingEngine;
  let router: OrderRouter;
  let internalAdapter: InternalMatchingEngineAdapter;
  let simulatorAdapter1: ExchangeSimulatorAdapter;
  let simulatorAdapter2: ExchangeSimulatorAdapter;
  let simulatorAdapter3: ExchangeSimulatorAdapter;

  beforeEach(() => {
    // Create fresh instances for each test
    tradingEngine = new TradingEngine();
    internalAdapter = new InternalMatchingEngineAdapter(tradingEngine, 'internal');

    // Deterministic simulators: a fixed (min === max) fill delay and a 100%
    // fill probability so reconciliation always observes a completed fill, and
    // failureRate 0 removes random submit/availability failures. Without this
    // the random 100-2000ms delays race the router's reconciliation schedule
    // and the suite is flaky.
    simulatorAdapter1 = new ExchangeSimulatorAdapter({
      venueId: 'binance_sim',
      failureRate: 0,
      fillProbability: 1.0,
      minFillDelayMs: 20,
      maxFillDelayMs: 20,
    });

    simulatorAdapter2 = new ExchangeSimulatorAdapter({
      venueId: 'coinbase_sim',
      failureRate: 0,
      fillProbability: 1.0,
      minFillDelayMs: 20,
      maxFillDelayMs: 20,
    });

    simulatorAdapter3 = new ExchangeSimulatorAdapter({
      venueId: 'kraken_sim',
      failureRate: 0,
      fillProbability: 1.0,
      minFillDelayMs: 20,
      maxFillDelayMs: 20,
    });

    // Route across three external simulators. The internal matching engine has
    // no resting liquidity in these tests, so an internal leg could never fill
    // or reconcile (reconciliation tasks are only created for external venues).
    // The internal adapter is still registered so the wiring mirrors production.
    router = new OrderRouter({
      venues: [
        { id: 'binance_sim', type: 'external', enabled: true, weight: 0.34 },
        { id: 'coinbase_sim', type: 'external', enabled: true, weight: 0.33 },
        { id: 'kraken_sim', type: 'external', enabled: true, weight: 0.33 },
      ],
      retryPolicy: {
        maxRetries: 3,
        initialBackoffMs: 100,
        maxBackoffMs: 1000,
        backoffMultiplier: 2,
        retryableErrors: ['network_error', 'timeout'],
      },
      reconciliationIntervalMs: 500,
      enableFailover: true,
    });

    // Register adapters
    router.registerAdapter(internalAdapter);
    router.registerAdapter(simulatorAdapter1);
    router.registerAdapter(simulatorAdapter2);
    router.registerAdapter(simulatorAdapter3);
  });

  afterEach(() => {
    router.destroy();
    simulatorAdapter1.destroy();
    simulatorAdapter2.destroy();
    simulatorAdapter3.destroy();
  });

  test('should split large order across multiple destinations and reconcile fills', async () => {
    // Create a large order that will be split across all three venues
    const testOrder: Order = {
      id: 'test_order_1',
      pair: 'BTC/USD',
      side: 'buy',
      type: 'limit',
      price: 50000,
      quantity: 100, // Will be split into ~33, 33, 34
      filled: 0,
      remaining: 100,
      status: 'pending',
      clientId: 'test_client',
      timestamp: Date.now(),
    };

    // Build routing plan
    const plan = router.buildRoutingPlan(testOrder);
    expect(plan.legs).toHaveLength(3); // One leg per venue
    
    // Verify quantities are split correctly (100 across 3 venues: 34, 33, 33 = 100)
    const totalAllocated = plan.legs.reduce((sum, leg) => sum + leg.destination.quantity, 0);
    expect(totalAllocated).toBe(100);

    // Execute the plan
    const result = await router.executePlan(plan);
    expect(result.success).toBe(true);
    
    // Verify all legs were submitted
    const updatedPlan = router.getPlan(plan.planId);
    expect(updatedPlan).toBeDefined();
    expect(updatedPlan?.legs.every(leg => leg.status === 'submitted' || leg.status === 'filled')).toBe(true);

    // Wait for reconciliation and fills to process
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check final state
    const finalPlan = router.getPlan(plan.planId);
    expect(finalPlan).toBeDefined();
    
    // All legs should be filled
    const allFilled = finalPlan?.legs.every(leg => leg.status === 'filled');
    expect(allFilled).toBe(true);
    
    // Total filled should equal original quantity
    expect(finalPlan?.totalFilled).toBe(100);
    
    // Plan should be complete
    expect(finalPlan?.status).toBe('complete');
  }, 10000); // Increase timeout for async operations

  test('should handle idempotency correctly to prevent duplicate fills', async () => {
    // Create test order
    const testOrder: Order = {
      id: 'test_order_2',
      pair: 'ETH/USD',
      side: 'sell',
      type: 'limit',
      price: 3000,
      quantity: 10,
      filled: 0,
      remaining: 10,
      status: 'pending',
      clientId: 'test_client',
      timestamp: Date.now(),
    };

    // Build plan with only one venue to keep it simple
    const singleVenueRouter = new OrderRouter({
      venues: [{ id: 'binance_sim', type: 'external', enabled: true }],
      retryPolicy: {
        maxRetries: 3,
        initialBackoffMs: 100,
        maxBackoffMs: 1000,
        backoffMultiplier: 2,
        retryableErrors: [],
      },
      reconciliationIntervalMs: 500,
      enableFailover: false,
    });
    singleVenueRouter.registerAdapter(simulatorAdapter1);

    const plan = singleVenueRouter.buildRoutingPlan(testOrder);
    expect(plan.legs).toHaveLength(1);

    // Execute plan first time
    const result1 = await singleVenueRouter.executePlan(plan);
    expect(result1.success).toBe(true);

    // Try to execute the same plan again (simulating retry)
    const result2 = await singleVenueRouter.executePlan(plan);
    expect(result2.success).toBe(true);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    const finalPlan = singleVenueRouter.getPlan(plan.planId);
    expect(finalPlan?.totalFilled).toBe(10); // Only filled once, not twice
    expect(finalPlan?.legs[0].fills.length).toBe(1); // Only one fill created

    singleVenueRouter.destroy();
  });

  test('should implement failover when a venue fails', async () => {
    // Create a simulator with high failure rate
    const failingSimulator = new ExchangeSimulatorAdapter({
      venueId: 'failing_exchange',
      failureRate: 1.0, // Always fail
    });

    const failoverRouter = new OrderRouter({
      venues: [
        { id: 'failing_exchange', type: 'external', enabled: true },
        { id: 'binance_sim', type: 'external', enabled: true }, // Backup venue
      ],
      retryPolicy: {
        maxRetries: 1, // Only retry once before failing over
        initialBackoffMs: 50,
        maxBackoffMs: 100,
        backoffMultiplier: 2,
        retryableErrors: ['Simulated exchange failure'],
      },
      reconciliationIntervalMs: 100,
      enableFailover: true,
    });

    failoverRouter.registerAdapter(failingSimulator);
    failoverRouter.registerAdapter(simulatorAdapter1);

    const testOrder: Order = {
      id: 'test_order_3',
      pair: 'BTC/USD',
      side: 'buy',
      type: 'limit',
      price: 50000,
      quantity: 50,
      filled: 0,
      remaining: 50,
      status: 'pending',
      clientId: 'test_client',
      timestamp: Date.now(),
    };

    const plan = failoverRouter.buildRoutingPlan(testOrder);
    expect(plan.legs).toHaveLength(2); // Split across both venues initially

    await failoverRouter.executePlan(plan);

    // Wait for failover to happen
    await new Promise(resolve => setTimeout(resolve, 3000));

    const finalPlan = failoverRouter.getPlan(plan.planId);
    expect(finalPlan).toBeDefined();
    
    // At least the binance venue should have successfully filled its portion
    const binanceLeg = finalPlan?.legs.find(l => l.destination.venueId === 'binance_sim');
    expect(binanceLeg?.status).toBe('filled');
    
    // The failing exchange leg should be marked as failed
    const failingLeg = finalPlan?.legs.find(l => l.destination.venueId === 'failing_exchange');
    expect(failingLeg?.status).toBe('failed');

    failoverRouter.destroy();
    failingSimulator.destroy();
  });

  test('should handle partial fills correctly', async () => {
    // Deterministic partial fill: the simulator fills 40 units after 100ms, then
    // the remaining 60 units after a further 2000ms. This scripted schedule
    // bypasses the probabilistic fill path so the partial-then-complete
    // transition is reproducible instead of flaky.
    const partialFillSimulator = new ExchangeSimulatorAdapter({
      venueId: 'partial_sim',
      failureRate: 0,
      fillSchedule: [
        { quantity: 40, delayMs: 100 },
        { quantity: 60, delayMs: 2000 },
      ],
    });

    const partialRouter = new OrderRouter({
      venues: [{ id: 'partial_sim', type: 'external', enabled: true }],
      retryPolicy: {
        maxRetries: 3,
        initialBackoffMs: 100,
        maxBackoffMs: 1000,
        backoffMultiplier: 2,
        retryableErrors: [],
      },
      reconciliationIntervalMs: 200,
      enableFailover: false,
    });

    partialRouter.registerAdapter(partialFillSimulator);

    const testOrder: Order = {
      id: 'test_order_4',
      pair: 'SOL/USD',
      side: 'buy',
      type: 'limit',
      price: 100,
      quantity: 100,
      filled: 0,
      remaining: 100,
      status: 'pending',
      clientId: 'test_client',
      timestamp: Date.now(),
    };

    const plan = partialRouter.buildRoutingPlan(testOrder);
    await partialRouter.executePlan(plan);

    // The router's first reconciliation for an external leg runs ~1000ms after
    // submission. By ~1500ms the simulator has applied the first (40 unit) fill
    // and reconciliation has observed it, so the leg is partially filled.
    await new Promise(resolve => setTimeout(resolve, 1500));

    const midPlan = partialRouter.getPlan(plan.planId);
    expect(midPlan?.legs[0].status).toBe('partial_fill');
    expect(midPlan?.legs[0].filled).toBe(40);
    expect(midPlan?.legs[0].filled).toBeLessThan(100);

    // The remaining 60 units fill at ~2100ms and the next reconciliation (~3000ms)
    // observes the completed fill. Wait comfortably past that.
    await new Promise(resolve => setTimeout(resolve, 3000));

    const finalPlan = partialRouter.getPlan(plan.planId);
    expect(finalPlan?.legs[0].status).toBe('filled');
    expect(finalPlan?.totalFilled).toBe(100);

    partialRouter.destroy();
    partialFillSimulator.destroy();
  }, 10000);
});