import { VenueAdapter } from '../types';
import { TradingEngine } from '@/lib/trading-engine';
import { Order, Fill } from '@/types/trading';

/**
 * Adapter for the internal matching engine
 */
export class InternalMatchingEngineAdapter implements VenueAdapter {
  private tradingEngine: TradingEngine;
  private venueId: string;
  private idempotencyCache: Map<
    string,
    { orderId: string; result: { success: boolean; orderId?: string; error?: string } }
  > = new Map();

  constructor(tradingEngine: TradingEngine, venueId: string = 'internal_engine') {
    this.tradingEngine = tradingEngine;
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
      const result = this.tradingEngine.submitOrder(order);
      
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
    const cancelled = this.tradingEngine.cancelOrder(orderId);
    if (!cancelled) {
      return { success: false, error: 'Order could not be cancelled (not found or already completed)' };
    }
    return { success: true };
  }

  async getStatus(orderId: string): Promise<{
    success: boolean;
    status?: Order['status'];
    filled?: number;
    remaining?: number;
    fills?: Fill[];
    error?: string;
  }> {
    const orderStatus = this.tradingEngine.getOrderStatus(orderId);

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