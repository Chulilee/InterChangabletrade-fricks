import { Order, Fill, OrderStatus } from '@/types/trading';

/**
 * Venue types - where orders can be routed
 */
export type VenueType = 'internal' | 'external';

/**
 * Routing destination - a specific venue with allocation
 */
export interface RoutingDestination {
  venueId: string;
  venueType: VenueType;
  quantity: number;
  orderId?: string;
}

/**
 * A single leg in the routing plan
 */
export interface RoutingPlanLeg {
  legId: string;
  destination: RoutingDestination;
  status: 'pending' | 'open' | 'submitted' | 'partial_fill' | 'filled' | 'cancelled' | 'failed';
  filled: number;
  remaining: number;
  fills: Fill[];
  attempts: number;
  lastAttemptAt?: number;
  error?: string;
}

/**
 * Complete routing plan for an order
 */
export interface RoutingPlan {
  planId: string;
  originalOrder: Order;
  legs: RoutingPlanLeg[];
  status: 'building' | 'executing' | 'partial_complete' | 'complete' | 'failed';
  totalFilled: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Retry policy configuration
 */
export interface RetryPolicy {
  maxRetries: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

/**
 * Venue adapter interface - must be implemented by all execution venues
 */
export interface VenueAdapter {
  /**
   * Send an order to the venue
   */
  sendOrder(order: Omit<Order, 'id' | 'filled' | 'remaining' | 'status' | 'timestamp'>, idempotencyKey: string): Promise<{
    success: boolean;
    orderId?: string;
    error?: string;
  }>;

  /**
   * Modify an existing order on the venue
   */
  modifyOrder(orderId: string, updates: { price?: number; quantity?: number }): Promise<{
    success: boolean;
    error?: string;
  }>;

  /**
   * Cancel an order on the venue
   */
  cancelOrder(orderId: string): Promise<{
    success: boolean;
    error?: string;
  }>;

  /**
   * Get the current status of an order
   */
  getStatus(orderId: string): Promise<{
    success: boolean;
    status?: OrderStatus;
    filled?: number;
    remaining?: number;
    fills?: Fill[];
    error?: string;
  }>;

  /**
   * Check if the venue is available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get the venue's ID
   */
  getVenueId(): string;
}

/**
 * Router configuration
 */
export interface RouterConfig {
  venues: {
    id: string;
    type: VenueType;
    enabled: boolean;
    weight?: number;
    maxAllocation?: number;
  }[];
  retryPolicy: RetryPolicy;
  reconciliationIntervalMs: number;
  enableFailover: boolean;
}

/**
 * Routing strategy interface - implements different order splitting algorithms
 */
export interface RoutingStrategy {
  /**
   * Build a routing plan for the given order
   */
  buildPlan(order: Order, availableVenues: RouterConfig['venues']): RoutingPlanLeg[];
}

/**
 * Idempotency record to prevent duplicate processing
 */
export interface IdempotencyRecord {
  key: string;
  orderId: string;
  processedAt: number;
  result: { success: boolean; orderId?: string; error?: string };
}

/**
 * Reconciliation task for tracking external orders that need status checks
 */
export interface ReconciliationTask {
  planId: string;
  legId: string;
  venueId: string;
  externalOrderId: string;
  nextReconciliationAt: number;
  attempts: number;
}