import { VenueAdapter } from '../types';
import { TradingEngine } from '../trading-engine';
import { Order, Fill } from '@/types/trading';

/**
 * Adapter for the internal matching engine
 */
export class InternalMatchingEngineAdapter implements VenueAdapter {
  private tradingEngine: TradingEngine;
  private venueId: string;
  private idempotencyCache: Map<string, { orderId: string; result: any }> = new Map();

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
    // Note: Current trading engine doesn't have cancelOrder, this is a placeholder
    // In a real implementation, this would call tradingEngine.cancelOrder()
    return { success: false, error: 'Cancellation not implemented for internal engine' };
  }

  async getStatus(orderId: string): Promise<{
    success: boolean;
    status?: Order['status'];
    filled?: number;
    remaining?: number;
    fills?: Fill[];
    error?: string;
  }> {
    // Access private order storage - in a real implementation, add getOrder() to TradingEngine
    // @ts-ignore - accessing private orders map for demonstration
    const order = this.tradingEngine.orders?.get(orderId);
    // @ts-ignore
    const fills = this.tradingEngine.fills?.get(orderId);

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    return {
      success: true,
      status: order.status,
      filled: order.filled,
      remaining: order.remaining,
      fills: fills || [],
    };
  }
}