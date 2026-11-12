import { RoutingStrategy, RoutingPlanLeg, RouterConfig } from '../types';
import { Order } from '@/types/trading';

/**
 * Weighted-split routing strategy.
 *
 * Allocates the order quantity **proportionally to each venue's
 * configured `weight`** (the same `weight` field the example
 * configuration sets for allocation sizing), so e.g. weights
 * `[0.4, 0.3, 0.3]` split a 100-unit order into 40 / 30 / 30.
 *
 * Algorithm and semantics:
 *
 * 1. Venues with a non-positive or non-finite `weight` (including
 *    venues without a weight) are **excluded from the allocation base**.
 *    If every venue is unweighted — or all weights are non-positive —
 *    the strategy falls back to an equal split across all venues, so a
 *    misconfigured weight set never starves the order entirely.
 * 2. Each participating venue receives `floor(quantity * weight /
 *    totalWeight)`. The indivisible remainder is distributed one unit at
 *    a time to the **largest-weight** legs (ties broken by venue order),
 *    so no single venue is starved of the remainder by an accident of
 *    ordering.
 * 3. Venues allocated zero quantity are omitted from the plan.
 *
 * Properties:
 *
 * - **Deterministic quantities.** Fixed order + fixed venue/weight list →
 *   fixed allocation. Leg identifiers embed `Date.now()` and a random
 *   suffix, so leg objects are not reproducible byte-for-byte.
 * - **No enabled venues, no legs.** An empty `availableVenues` array
 *   yields an empty plan, which the router surfaces as a routing failure.
 * - **Weights are relative.** Only the ratio between weights matters;
 *   they do not need to sum to 1.
 *
 * @example
 * ```ts
 * // venues: [{ id: 'a', weight: 0.6 }, { id: 'b', weight: 0.4 }], order of 100
 * const legs = new WeightedSplitStrategy().buildPlan(order, venues);
 * // → 60 to 'a', 40 to 'b'
 * ```
 */
export class WeightedSplitStrategy implements RoutingStrategy {
  /**
   * Build the routing legs for `order` across `availableVenues`,
   * allocating proportionally to venue weights.
   *
   * @param order - The order to route. Only `quantity` and the identity
   *   fields copied onto each leg are read.
   * @param availableVenues - Enabled venues. Their `weight` fields define
   *   the allocation ratio; unweighted venues are skipped unless none of
   *   them carries a weight at all.
   * @returns One leg per venue receiving at least one unit, in venue order.
   */
  buildPlan(order: Order, availableVenues: RouterConfig['venues']): RoutingPlanLeg[] {
    if (availableVenues.length === 0) {
      return [];
    }

    const weights = availableVenues.map((venue) =>
      typeof venue.weight === 'number' && Number.isFinite(venue.weight) && venue.weight > 0
        ? venue.weight
        : 0,
    );
    let totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    // All-zero weights: fall back to an equal split rather than failing.
    const effectiveWeights = totalWeight > 0 ? weights : weights.map(() => 1);
    if (totalWeight <= 0) {
      totalWeight = availableVenues.length;
    }

    const quantities = effectiveWeights.map((weight) =>
      Math.floor((order.quantity * weight) / totalWeight),
    );

    // Distribute the indivisible remainder one unit at a time, largest
    // weight first; ties break by venue order for determinism.
    const distributed = quantities.reduce((sum, quantity) => sum + quantity, 0);
    let remainder = order.quantity - distributed;
    const remainderOrder = availableVenues
      .map((_, index) => index)
      .sort((a, b) => (effectiveWeights[b] - effectiveWeights[a]) || (a - b));

    let cursor = 0;
    while (remainder > 0 && remainderOrder.length > 0) {
      quantities[remainderOrder[cursor % remainderOrder.length]] += 1;
      remainder -= 1;
      cursor += 1;
    }

    const legs: RoutingPlanLeg[] = [];
    availableVenues.forEach((venue, index) => {
      const legQuantity = quantities[index];
      if (legQuantity > 0) {
        legs.push({
          legId: `leg_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 11)}`,
          destination: {
            venueId: venue.id,
            venueType: venue.type,
            quantity: legQuantity,
          },
          status: 'pending',
          filled: 0,
          remaining: legQuantity,
          fills: [],
          attempts: 0,
        });
      }
    });

    return legs;
  }
}
