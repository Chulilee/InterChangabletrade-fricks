import { VenueAdapter } from '../types';
import { Order, Fill, OrderStatus, OrderSide } from '@/types/trading';

/**
 * Configuration for the exchange simulator
 */
export interface ExchangeSimulatorConfig {
  venueId: string;
  fillProbability: number; // 0-1, probability of immediate fill
  partialFillProbability: number; // 0-1, probability of partial fill if not fully filled
  minFillDelayMs: number;
  maxFillDelayMs: number;
  failureRate: number; // 0-1, probability of request failure
  supportMarketOrders: boolean;
  supportLimitOrders: boolean;
}

/**
 * Default configuration for the simulator
 */
const DEFAULT_CONFIG: ExchangeSimulatorConfig = {
  venueId: 'simulator_default',
  fillProbability: 0.7,
  partialFillProbability: 0.5,
  minFillDelayMs: 100,
  maxFillDelayMs: 2000,
  failureRate: 0.05,
  supportMarketOrders: true,
  supportLimitOrders: true,
};

/**
 * Internal order tracking for simulator
 */
interface SimulatedOrder {
  id: string;
  order: Order;
  status: OrderStatus;
  filled: number;
  remaining: number;
  fills: Fill[];
  idempotencyKey: string;
  createdAt: number;
}

/**
 * Exchange simulator adapter - mimics real exchange behavior for testing
 */
export class ExchangeSimulatorAdapter implements VenueAdapter {
  private config: ExchangeSimulatorConfig;
  private orders: Map<string, SimulatedOrder> = new Map();
  private idempotencyCache: Map<string, { orderId: string; result: any }> = new Map();
  private fillTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<ExchangeSimulatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getVenueId(): string {
    return this.config.venueId;
  }

  /**
   * Generate a random delay within configured bounds
   */
  private getRandomDelay(): number {
    return this.config.minFillDelayMs + 
      Math.random() * (this.config.maxFillDelayMs - this.config.minFillDelayMs);
  }

  /**
   * Check if request should fail based on failure rate
   */
  private shouldFail(): boolean {
    return Math.random() < this.config.failureRate;
  }

  /**
   * Generate a unique order ID
   */
  private generateOrderId(): string {
    return `${this.config.venueId}_ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a fill ID
   */
  private generateFillId(): string {
    return `fill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Schedule fills for an order
   */
  private scheduleFills(simOrder: SimulatedOrder): void {
    const delay = this.getRandomDelay();
    
    const timer = setTimeout(() => {
      this.processOrderFills(simOrder);
    }, delay);

    this.fillTimers.set(simOrder.id, timer);
  }

  /**
   * Process fills for an order - simulates market matching
   */
  private processOrderFills(simOrder: SimulatedOrder): void {
    if (simOrder.status === 'filled' || simOrder.status === 'cancelled') {
      return;
    }

    let remainingToFill = simOrder.remaining;
    
    // Check if we fully fill
    if (Math.random() < this.config.fillProbability) {
      // Full fill
      const fill: Fill = {
        id: this.generateFillId(),
        orderId: simOrder.id,
        makerOrderId: `sim_maker_${Date.now()}`,
        pair: simOrder.order.pair,
        side: simOrder.order.side,
        price: simOrder.order.price,
        quantity: remainingToFill,
        timestamp: Date.now(),
      };

      simOrder.fills.push(fill);
      simOrder.filled += remainingToFill;
      simOrder.remaining = 0;
      simOrder.status = 'filled';
    } 
    // Check if we partially fill
    else if (Math.random() < this.config.partialFillProbability && remainingToFill > 1) {
      const fillQuantity = Math.floor(Math.random() * (remainingToFill - 1)) + 1;
      
      const fill: Fill = {
        id: this.generateFillId(),
        orderId: simOrder.id,
        makerOrderId: `sim_maker_${Date.now()}`,
        pair: simOrder.order.pair,
        side: simOrder.order.side,
        price: simOrder.order.price,
        quantity: fillQuantity,
        timestamp: Date.now(),
      };

      simOrder.fills.push(fill);
      simOrder.filled += fillQuantity;
      simOrder.remaining -= fillQuantity;
      simOrder.status = 'partial_fill';

      // Schedule another fill for remaining quantity
      setTimeout(() => this.processOrderFills(simOrder), this.getRandomDelay());
    } 
    // Order remains open
    else {
      simOrder.status = 'open';
    }

    this.orders.set(simOrder.id, simOrder);
  }

  async isAvailable(): Promise<boolean> {
    // Simulator is always available unless we want to test failures
    return !this.shouldFail() || Math.random() > 0.1; // 10% chance of being unavailable
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

    // Simulate random failure
    if (this.shouldFail()) {
      return { success: false, error: 'Simulated exchange failure' };
    }

    // Validate order type support
    if (order.type === 'market' && !this.config.supportMarketOrders) {
      return { success: false, error: 'Market orders not supported' };
    }
    if (order.type === 'limit' && !this.config.supportLimitOrders) {
      return { success: false, error: 'Limit orders not supported' };
    }

    // Create simulated order
    const orderId = this.generateOrderId();
    const fullOrder: Order = {
      ...order,
      id: orderId,
      filled: 0,
      remaining: order.quantity,
      status: 'pending',
      timestamp: Date.now(),
    };

    const simOrder: SimulatedOrder = {
      id: orderId,
      order: fullOrder,
      status: 'pending',
      filled: 0,
      remaining: order.quantity,
      fills: [],
      idempotencyKey,
      createdAt: Date.now(),
    };

    this.orders.set(orderId, simOrder);
    
    // Cache for idempotency
    this.idempotencyCache.set(idempotencyKey, {
      orderId,
      result: { success: true, orderId }
    });

    // Start processing fills
    this.scheduleFills(simOrder);

    return { success: true, orderId };
  }

  async modifyOrder(orderId: string, updates: { price?: number; quantity?: number }): Promise<{ success: boolean; error?: string }> {
    if (this.shouldFail()) {
      return { success: false, error: 'Simulated exchange failure' };
    }

    const simOrder = this.orders.get(orderId);
    if (!simOrder) {
      return { success: false, error: 'Order not found' };
    }

    if (simOrder.status === 'filled' || simOrder.status === 'cancelled') {
      return { success: false, error: 'Cannot modify completed order' };
    }

    if (updates.price) {
      simOrder.order.price = updates.price;
    }
    if (updates.quantity) {
      const quantityDiff = updates.quantity - simOrder.order.quantity;
      if (quantityDiff > 0) {
        simOrder.remaining += quantityDiff;
        simOrder.order.quantity = updates.quantity;
      }
    }

    this.orders.set(orderId, simOrder);
    return { success: true };
  }

  async cancelOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
    if (this.shouldFail()) {
      return { success: false, error: 'Simulated exchange failure' };
    }

    const simOrder = this.orders.get(orderId);
    if (!simOrder) {
      return { success: false, error: 'Order not found' };
    }

    if (simOrder.status === 'filled') {
      return { success: false, error: 'Cannot cancel filled order' };
    }

    // Clear any pending fill timers
    const timer = this.fillTimers.get(orderId);
    if (timer) {
      clearTimeout(timer);
      this.fillTimers.delete(orderId);
    }

    simOrder.status = 'cancelled';
    this.orders.set(orderId, simOrder);

    return { success: true };
  }

  async getStatus(orderId: string): Promise<{
    success: boolean;
    status?: OrderStatus;
    filled?: number;
    remaining?: number;
    fills?: Fill[];
    error?: string;
  }> {
    const simOrder = this.orders.get(orderId);
    if (!simOrder) {
      return { success: false, error: 'Order not found' };
    }

    return {
      success: true,
      status: simOrder.status,
      filled: simOrder.filled,
      remaining: simOrder.remaining,
      fills: [...simOrder.fills],
    };
  }

  /**
   * Cleanup method to clear all timers
   */
  destroy(): void {
    this.fillTimers.forEach(timer => clearTimeout(timer));
    this.fillTimers.clear();
    this.orders.clear();
    this.idempotencyCache.clear();
  }
}