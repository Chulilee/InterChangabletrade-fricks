import { OrderRouter } from '../../orderRouter';
import { Order } from '@/types/trading';
import { SplitEqualStrategy } from '../splitEqualStrategy';
import { WeightedSplitStrategy } from '../weightedSplitStrategy';
import {
  SPLIT_EQUAL_STRATEGY_ID,
  WEIGHTED_SPLIT_STRATEGY_ID,
  DEFAULT_ROUTING_STRATEGY_ID,
  BUILTIN_STRATEGY_IDS,
  StrategyRegistry,
  createStrategyRegistry,
  createStrategy,
  listStrategyIds,
  resolveStrategy,
} from '../index';
import type { RouterConfig, RoutingStrategy } from '../../types';

function makeOrder(quantity: number, overrides: Partial<Order> = {}): Order {
  return {
    id: 'test-order',
    pair: 'BTC/USD',
    side: 'buy',
    type: 'limit',
    price: 50000,
    quantity,
    filled: 0,
    remaining: quantity,
    status: 'pending',
    clientId: 'test-client',
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeVenues(
  specs: Array<{ id: string; weight?: number; enabled?: boolean }>,
): RouterConfig['venues'] {
  return specs.map((spec) => ({
    id: spec.id,
    type: 'internal' as const,
    enabled: spec.enabled ?? true,
    weight: spec.weight,
  }));
}

function routerConfig(overrides: Partial<RouterConfig> = {}): RouterConfig {
  return {
    venues: makeVenues([
      { id: 'venue-a', weight: 0.6 },
      { id: 'venue-b', weight: 0.3 },
      { id: 'venue-c', weight: 0.1 },
    ]),
    retryPolicy: {
      maxRetries: 1,
      initialBackoffMs: 10,
      maxBackoffMs: 100,
      backoffMultiplier: 2,
      retryableErrors: [],
    },
    reconciliationIntervalMs: 60_000,
    enableFailover: false,
    ...overrides,
  };
}

describe('SplitEqualStrategy', () => {
  it('splits the quantity equally across venues', () => {
    const legs = new SplitEqualStrategy().buildPlan(
      makeOrder(100),
      makeVenues([{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]),
    );

    expect(legs.map((leg) => leg.destination.quantity)).toEqual([25, 25, 25, 25]);
    expect(legs.map((leg) => leg.destination.venueId)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('assigns the indivisible remainder to the first venue', () => {
    const legs = new SplitEqualStrategy().buildPlan(
      makeOrder(101),
      makeVenues([{ id: 'a' }, { id: 'b' }, { id: 'c' }]),
    );

    expect(legs.map((leg) => leg.destination.quantity)).toEqual([35, 33, 33]);
  });

  it('skips venues that would receive zero quantity', () => {
    const legs = new SplitEqualStrategy().buildPlan(
      makeOrder(2),
      makeVenues([{ id: 'a' }, { id: 'b' }, { id: 'c' }]),
    );

    expect(legs).toHaveLength(1);
    expect(legs[0].destination).toMatchObject({ venueId: 'a', quantity: 2 });
  });

  it('returns an empty plan when there are no venues', () => {
    expect(new SplitEqualStrategy().buildPlan(makeOrder(10), [])).toEqual([]);
  });

  it('initializes legs in the pending state with correct remaining quantity', () => {
    const legs = new SplitEqualStrategy().buildPlan(
      makeOrder(10),
      makeVenues([{ id: 'a' }, { id: 'b' }]),
    );

    for (const leg of legs) {
      expect(leg.status).toBe('pending');
      expect(leg.filled).toBe(0);
      expect(leg.remaining).toBe(leg.destination.quantity);
      expect(leg.fills).toEqual([]);
      expect(leg.attempts).toBe(0);
    }
  });
});

describe('WeightedSplitStrategy', () => {
  it('allocates proportionally to venue weights', () => {
    const legs = new WeightedSplitStrategy().buildPlan(
      makeOrder(100),
      makeVenues([
        { id: 'a', weight: 0.6 },
        { id: 'b', weight: 0.3 },
        { id: 'c', weight: 0.1 },
      ]),
    );

    expect(legs.map((leg) => leg.destination.quantity)).toEqual([60, 30, 10]);
  });

  it('distributes the indivisible remainder to the largest-weight venue', () => {
    const legs = new WeightedSplitStrategy().buildPlan(
      makeOrder(11),
      makeVenues([
        { id: 'a', weight: 0.5 },
        { id: 'b', weight: 0.3 },
        { id: 'c', weight: 0.2 },
      ]),
    );

    // floor(5.5) / floor(3.3) / floor(2.2) = 5/3/2 -> remainder 1 to 'a'
    expect(legs.map((leg) => leg.destination.quantity)).toEqual([6, 3, 2]);
  });

  it('uses weight ratios, not absolute values', () => {
    const legs = new WeightedSplitStrategy().buildPlan(
      makeOrder(10),
      makeVenues([
        { id: 'a', weight: 2 },
        { id: 'b', weight: 1 },
        { id: 'c', weight: 1 },
      ]),
    );

    // floor(5) / floor(2.5) / floor(2.5) = 5/2/2 -> remainder 1 to 'a'
    expect(legs.map((leg) => leg.destination.quantity)).toEqual([6, 2, 2]);
  });

  it('skips venues without a weight when at least one venue is weighted', () => {
    const legs = new WeightedSplitStrategy().buildPlan(
      makeOrder(10),
      makeVenues([{ id: 'a', weight: 1 }, { id: 'b' }]),
    );

    expect(legs).toHaveLength(1);
    expect(legs[0].destination).toMatchObject({ venueId: 'a', quantity: 10 });
  });

  it('falls back to an equal split when no venue carries a usable weight', () => {
    const legs = new WeightedSplitStrategy().buildPlan(
      makeOrder(11),
      makeVenues([{ id: 'a' }, { id: 'b' }, { id: 'c' }]),
    );

    expect(legs.map((leg) => leg.destination.quantity)).toEqual([4, 4, 3]);
  });

  it('treats non-positive weights as no weight at all', () => {
    const legs = new WeightedSplitStrategy().buildPlan(
      makeOrder(10),
      makeVenues([
        { id: 'a', weight: 0 },
        { id: 'b', weight: -3 },
        { id: 'c', weight: Number.NaN },
      ]),
    );

    // All weights unusable -> equal fallback
    expect(legs.map((leg) => leg.destination.quantity)).toEqual([4, 3, 3]);
  });

  it('returns an empty plan when there are no venues', () => {
    expect(new WeightedSplitStrategy().buildPlan(makeOrder(10), [])).toEqual([]);
  });
});

describe('strategy registry / factory', () => {
  it('lists the two built-in strategy ids', () => {
    expect(listStrategyIds()).toEqual([SPLIT_EQUAL_STRATEGY_ID, WEIGHTED_SPLIT_STRATEGY_ID]);
    expect(BUILTIN_STRATEGY_IDS).toContain(SPLIT_EQUAL_STRATEGY_ID);
    expect(BUILTIN_STRATEGY_IDS).toContain(WEIGHTED_SPLIT_STRATEGY_ID);
    expect(DEFAULT_ROUTING_STRATEGY_ID).toBe(SPLIT_EQUAL_STRATEGY_ID);
  });

  it('creates built-in strategies by id', () => {
    expect(createStrategy(SPLIT_EQUAL_STRATEGY_ID)).toBeInstanceOf(SplitEqualStrategy);
    expect(createStrategy(WEIGHTED_SPLIT_STRATEGY_ID)).toBeInstanceOf(WeightedSplitStrategy);
  });

  it('throws with the list of built-in ids for unknown ids', () => {
    expect(() => createStrategy('nope')).toThrow(/split-equal/);
    expect(() => createStrategy('nope')).toThrow(/weighted-split/);
  });

  it('resolveStrategy(undefined) returns the default strategy', () => {
    expect(resolveStrategy(undefined)).toBeInstanceOf(SplitEqualStrategy);
  });

  it('resolveStrategy resolves explicit built-in ids and rejects unknown ones', () => {
    expect(resolveStrategy(WEIGHTED_SPLIT_STRATEGY_ID)).toBeInstanceOf(WeightedSplitStrategy);
    expect(() => resolveStrategy('does-not-exist')).toThrow(/Unknown/);
  });

  it('StrategyRegistry is seeded with the built-ins and supports registration', () => {
    const registry = createStrategyRegistry();
    expect(registry.has(SPLIT_EQUAL_STRATEGY_ID)).toBe(true);
    expect(registry.has(WEIGHTED_SPLIT_STRATEGY_ID)).toBe(true);
    expect(registry.ids()).toEqual(expect.arrayContaining([SPLIT_EQUAL_STRATEGY_ID, WEIGHTED_SPLIT_STRATEGY_ID]));

    const custom: RoutingStrategy = {
      buildPlan: () => [],
    };
    registry.register('custom-thing', () => custom);
    expect(registry.has('custom-thing')).toBe(true);
    expect(registry.create('custom-thing')).toBe(custom);
  });

  it('StrategyRegistry.create throws with available ids for unknown names', () => {
    const registry = new StrategyRegistry();
    expect(() => registry.create('missing')).toThrow(/split-equal, weighted-split/);
  });

  it('StrategyRegistry.register rejects invalid input', () => {
    const registry = new StrategyRegistry();
    expect(() => registry.register('', () => new SplitEqualStrategy())).toThrow();
    expect(() => registry.register('x', undefined as never)).toThrow();
  });
});

describe('OrderRouter strategy selection configuration', () => {
  let router: OrderRouter | undefined;

  afterEach(() => {
    router?.destroy();
    router = undefined;
  });

  it('defaults to split-equal when routingStrategy is not set', () => {
    router = new OrderRouter(routerConfig());
    const plan = router.buildRoutingPlan(makeOrder(100));

    expect(plan.legs.map((leg) => leg.destination.quantity)).toEqual([34, 33, 33]);
  });

  it('honors routingStrategy: weighted-split from RouterConfig', () => {
    router = new OrderRouter(routerConfig({ routingStrategy: WEIGHTED_SPLIT_STRATEGY_ID }));
    const plan = router.buildRoutingPlan(makeOrder(100));

    expect(plan.legs.map((leg) => leg.destination.quantity)).toEqual([60, 30, 10]);
  });

  it('throws at construction for an unknown configured strategy id', () => {
    expect(() => new OrderRouter(routerConfig({ routingStrategy: 'nope' }))).toThrow(/split-equal/);
  });

  it('throws for an unknown per-call strategy name with the registered list', () => {
    const instance = new OrderRouter(routerConfig());
    router = instance;
    expect(() => instance.buildRoutingPlan(makeOrder(10), 'nope')).toThrow(/Registered strategies/);
  });

  it('allows a registered custom strategy to be used per call', () => {
    router = new OrderRouter(routerConfig());
    router.registerStrategy('double-a', {
      buildPlan: (order, venues) => {
        const venue = venues[0];
        if (!venue) return [];
        return [
          {
            legId: 'custom-leg',
            destination: {
              venueId: venue.id,
              venueType: venue.type,
              quantity: order.quantity,
            },
            status: 'pending',
            filled: 0,
            remaining: order.quantity,
            fills: [],
            attempts: 0,
          },
        ];
      },
    });

    const plan = router.buildRoutingPlan(makeOrder(42), 'double-a');
    expect(plan.legs).toHaveLength(1);
    expect(plan.legs[0].destination.quantity).toBe(42);
  });
});
