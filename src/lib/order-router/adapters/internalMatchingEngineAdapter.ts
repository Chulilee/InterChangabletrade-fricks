import { VenueAdapter, type MatchingEngine, type RoutingPlanLeg } from '../types';
import { Order, Fill } from '@/types/trading';

/**
 * Adapter for the internal matching engine.
 *
 * Accepts any {@link MatchingEngine} implementation so the router can be wired
 * to the real engine in production and to a mock in unit tests.
 */
export class InternalMatchingEngineAdapter implements VenueAdapter {
  private matchingEngine: MatchingEngine;
  private venueId: string;
  private idempotencyCache: Map<
    string,
    { orderId: string; result: { success: boolean; orderId?: string; error?: string } }
  > = new Map();

  constructor(matchingEngine: MatchingEngine, venueId: string = 'internal_engine') {
    this.matchingEngine = matchingEngine;
    this.venueId = venueId;
  }

  getVenueId(): string {
    return this.venueId;
  }

  async isAvailable(): Promise<boolean> {
    // Internal engine is always available
    return true;
  }

  async sendOrder(
    order: Omit<Order, 'id' | 'filled' | 'remaining' | 'status' | 'timestamp'>,
    idempotencyKey: string
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
    // Check idempotency
    if (this.idempotencyCache.has(idempotencyKey)) {
      const cached = this.idempotencyCache.get(idempotencyKey)!;
      return { success: true, orderId: cached.orderId };
    }

    try {
      const result = this.matchingEngine.submitOrder(order);

      if (!result) {
        return { success: false, error: 'Internal engine rejected order' };
      }

      // Cache for idempotency
      this.idempotencyCache.set(idempotencyKey, {
        orderId: result.id,
        result: { success: true, orderId: result.id }
      });

      return { success: true, orderId: result.id };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async modifyOrder(): Promise<{ success: boolean; error?: string }> {
    // Internal engine doesn't support modifications in current implementation
    return { success: false, error: 'Modifications not supported by internal engine' };
  }

  async cancelOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
    const cancelled = this.matchingEngine.cancelOrder(orderId);
    if (!cancelled) {
      return { success: false, error: 'Order could not be cancelled (not found or already completed)' };
    }
    return { success: true };
  }

  async rollbackOrder(leg: RoutingPlanLeg): Promise<{ success: boolean; error?: string }> {
    // For internal matching engine, rollback means cancelling the order
    const orderId = leg.destination.orderId;
    if (!orderId) {
      return { success: false, error: 'No order ID to rollback' };
    }
    return this.cancelOrder(orderId);
  }

  async getStatus(orderId: string): Promise<{
    success: boolean;
    status?: Order['status'];
    filled?: number;
    remaining?: number;
    fills?: Fill[];
    error?: string;
  }> {
    const orderStatus = this.matchingEngine.getOrderStatus(orderId);

    if (!orderStatus) {
      return { success: false, error: 'Order not found' };
    }

    return {
      success: true,
      status: orderStatus.status,
      filled: orderStatus.filled,
      remaining: orderStatus.remaining,
      fills: orderStatus.fills,
    };
  }
}