import { RoutingStrategy, RoutingPlanLeg, RouterConfig } from '../types';
import { Order } from '@/types/trading';

/**
 * Equal-split routing strategy.
 *
 * Divides the order quantity as evenly as possible across all enabled
 * venues in `availableVenues` — every venue receives the same base
 * quantity, and the remainder (when `quantity` is not divisible by the
 * venue count) is assigned to the **first** venue in the array. Venues
 * that would receive zero quantity are skipped, so an order smaller than
 * the venue count is not spread thinner than it can be.
 *
 * Properties worth knowing before extending or reusing this strategy:
 *
 * - **Venue weights are ignored.** Allocation is purely positional/equal;
 *   configure weights and select the `weighted-split` strategy instead if
 *   you need proportional allocation.
 * - **Deterministic quantities.** For a fixed order and venue list, the
 *   per-venue quantities are always the same. Leg identifiers include
 *   `Date.now()` and a random suffix, so legs are not reproducible
 *   byte-for-byte.
 * - **Zero-allocation venues are omitted.** If `quantity < venueCount`,
 *   only the venues receiving at least one unit produce legs.
 * - **No enabled venues, no legs.** An empty `availableVenues` array
 *   yields an empty plan, which the router surfaces as a routing failure.
 *
 * @example
 * ```ts
 * const legs = new SplitEqualStrategy().buildPlan(order, venues);
 * // 100 units across 3 venues → 34 / 33 / 33
 * ```
 */
export class SplitEqualStrategy implements RoutingStrategy {
  /**
   * Build the routing legs for `order` across `availableVenues`.
   *
   * @param order - The order to route. Only `quantity` and the identity
   *   fields copied onto each leg are read.
   * @param availableVenues - Enabled venues in allocation order. The first
   *   venue in the array absorbs the indivisible remainder.
   * @returns One leg per venue receiving at least one unit, in venue order.
   */
  buildPlan(order: Order, availableVenues: RouterConfig['venues']): RoutingPlanLeg[] {
    const legs: RoutingPlanLeg[] = [];
    const venueCount = availableVenues.length;

    if (venueCount === 0) {
      return [];
    }

    const baseQuantity = Math.floor(order.quantity / venueCount);
    const remainder = order.quantity % venueCount;

    availableVenues.forEach((venue, index) => {
      const legQuantity = baseQuantity + (index === 0 ? remainder : 0);

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
