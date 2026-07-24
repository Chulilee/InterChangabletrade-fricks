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

  beforeEach(() => {
    // Create fresh instances for each test
    tradingEngine = new TradingEngine();
    internalAdapter = new InternalMatchingEngineAdapter(tradingEngine, 'internal');

    // Create two exchange simulators with low failure rates for testing
    simulatorAdapter1 = new ExchangeSimulatorAdapter({
      venueId: 'binance_sim',
      failureRate: 0, // No failures for basic tests
      fillProbability: 1.0, // Always fill immediately
    });

    simulatorAdapter2 = new ExchangeSimulatorAdapter({
      venueId: 'coinbase_sim',
      failureRate: 0,
      fillProbability: 1.0,
    });

    // Configure router
    router = new OrderRouter({
      venues: [
        { id: 'internal', type: 'internal', enabled: true, weight: 0.5 },
        { id: 'binance_sim', type: 'external', enabled: true, weight: 0.25 },
        { id: 'coinbase_sim', type: 'external', enabled: true, weight: 0.25 },
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
  });

  afterEach(() => {
    router.destroy();
    simulatorAdapter1.destroy();
    simulatorAdapter2.destroy();
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
    // Create a simulator that frequently does partial fills
    const partialFillSimulator = new ExchangeSimulatorAdapter({
      venueId: 'partial_sim',
      fillProbability: 0.2, // Rarely fills completely immediately
      partialFillProbability: 0.9, // Often partially fills
      minFillDelayMs: 100,
      maxFillDelayMs: 500,
      failureRate: 0,
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

    // Check for partial fill state
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const midPlan = partialRouter.getPlan(plan.planId);
    expect(midPlan?.legs[0].status).toBe('partial_fill');
    expect(midPlan?.legs[0].filled).toBeGreaterThan(0);
    expect(midPlan?.legs[0].filled).toBeLessThan(100);

    // Wait for complete fill
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const finalPlan = partialRouter.getPlan(plan.planId);
    expect(finalPlan?.legs[0].status).toBe('filled');
    expect(finalPlan?.totalFilled).toBe(100);

    partialRouter.destroy();
    partialFillSimulator.destroy();
  });
});