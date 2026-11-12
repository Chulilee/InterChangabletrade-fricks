/**
 * Routing strategy registry and factory (issue #78).
 *
 * This module is the single place that knows which routing strategies
 * exist, how to construct them, and how a router resolves the configured
 * `routingStrategy` identifier. It exists so that:
 *
 * - **Selection is configurable.** Set `RouterConfig.routingStrategy` to a
 *   registered identifier (built-ins: `'split-equal'`, `'weighted-split'`);
 *   the router resolves it at construction and fails fast on an unknown id
 *   instead of silently falling back.
 * - **Strategies are extended by registration.** Register a custom
 *   strategy with `StrategyRegistry.register` (or pass `strategies` to
 *   `createStrategyRegistry`) without touching router code; the router's
 *   `registerStrategy` remains available for per-instance overrides.
 * - **Unit tests are straightforward.** Instantiate a strategy, a
 *   registry, or a router with any config combination.
 *
 * @example
 * ```ts
 * import { resolveStrategy } from './strategies';
 * const strategy = resolveStrategy('weighted-split');
 * const legs = strategy.buildPlan(order, venues);
 * ```
 */

import type { RoutingStrategy } from '../types';
import { SplitEqualStrategy } from './splitEqualStrategy';
import { WeightedSplitStrategy } from './weightedSplitStrategy';

export { SplitEqualStrategy } from './splitEqualStrategy';
export { WeightedSplitStrategy } from './weightedSplitStrategy';

/** Identifier of the built-in equal-split strategy. */
export const SPLIT_EQUAL_STRATEGY_ID = 'split-equal';

/** Identifier of the built-in weight-proportional split strategy. */
export const WEIGHTED_SPLIT_STRATEGY_ID = 'weighted-split';

/** Default strategy identifier used when `RouterConfig.routingStrategy` is unset. */
export const DEFAULT_ROUTING_STRATEGY_ID = SPLIT_EQUAL_STRATEGY_ID;

/** Identifiers of every built-in strategy. */
export const BUILTIN_STRATEGY_IDS: readonly string[] = [
  SPLIT_EQUAL_STRATEGY_ID,
  WEIGHTED_SPLIT_STRATEGY_ID,
];

/** Zero-argument factory producing a fresh strategy instance. */
export type StrategyFactory = () => RoutingStrategy;

const BUILTIN_STRATEGY_FACTORIES: ReadonlyMap<string, StrategyFactory> = new Map([
  [SPLIT_EQUAL_STRATEGY_ID, () => new SplitEqualStrategy()],
  [WEIGHTED_SPLIT_STRATEGY_ID, () => new WeightedSplitStrategy()],
]);

/** Options for {@link StrategyRegistry}. */
export interface StrategyRegistryOptions {
  /**
   * Additional named strategies to register on top of the built-ins.
   * Ids may shadow built-ins on purpose — explicit registration wins.
   */
  readonly strategies?: Readonly<Record<string, StrategyFactory>>;
}

function assertValidStrategyId(id: string): void {
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('Strategy id must be a non-empty string');
  }
}

function formatAvailable(ids: readonly string[]): string {
  return ids.length > 0 ? ids.join(', ') : '(none)';
}

/**
 * Factory-backed registry of routing strategies.
 *
 * Seeded with the two built-ins; supports registration of additional or
 * replacement strategies. Registries are independent — registering on one
 * does not affect another.
 */
export class StrategyRegistry {
  private readonly factories = new Map<string, StrategyFactory>();

  constructor(options: StrategyRegistryOptions = {}) {
    for (const [id, factory] of BUILTIN_STRATEGY_FACTORIES) {
      this.factories.set(id, factory);
    }
    if (options.strategies) {
      for (const [id, factory] of Object.entries(options.strategies)) {
        this.register(id, factory);
      }
    }
  }

  /**
   * Register (or replace) a strategy with the given id.
   *
   * @returns This registry, for chaining.
   * @throws Error when the id is blank or the factory is not a function.
   */
  register(id: string, factory: StrategyFactory): this {
    assertValidStrategyId(id);
    if (typeof factory !== 'function') {
      throw new Error(`Factory for strategy "${id.trim()}" must be a function`);
    }
    this.factories.set(id.trim(), factory);
    return this;
  }

  /** True when a strategy with this id is registered. */
  has(id: string): boolean {
    return this.factories.has(id);
  }

  /** Registered strategy ids, in insertion order. */
  ids(): string[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Construct the strategy registered under `id`.
   *
   * @throws Error listing the available ids when `id` is not registered.
   */
  create(id: string): RoutingStrategy {
    const factory = this.factories.get(id);
    if (!factory) {
      throw new Error(
        `Unknown routing strategy "${String(id)}". Available strategies: ${formatAvailable(this.ids())}`,
      );
    }
    return factory();
  }
}

/** Creates a {@link StrategyRegistry} seeded with the built-ins. */
export function createStrategyRegistry(
  options: StrategyRegistryOptions = {},
): StrategyRegistry {
  return new StrategyRegistry(options);
}

/** Ids of the built-in strategies, in display order. */
export function listStrategyIds(): string[] {
  return [...BUILTIN_STRATEGY_IDS];
}

/**
 * Create one of the built-in strategies by id.
 *
 * @throws Error listing the built-in ids when `id` is not built in.
 */
export function createStrategy(id: string): RoutingStrategy {
  const factory = BUILTIN_STRATEGY_FACTORIES.get(id);
  if (!factory) {
    throw new Error(
      `Unknown built-in routing strategy "${String(id)}". Built-in strategies: ${formatAvailable(
        BUILTIN_STRATEGY_IDS,
      )}`,
    );
  }
  return factory();
}

/**
 * Resolve the strategy to use for `id`.
 *
 * `undefined` selects the default (`DEFAULT_ROUTING_STRATEGY_ID`); an
 * explicit id must match a built-in (custom strategies should be resolved
 * from an application-owned {@link StrategyRegistry} instead).
 *
 * @throws Error listing the built-in ids when an explicit, unknown id is passed.
 */
export function resolveStrategy(id?: string): RoutingStrategy {
  if (id === undefined) {
    return createStrategy(DEFAULT_ROUTING_STRATEGY_ID);
  }
  assertValidStrategyId(id);
  return createStrategy(id.trim());
}
