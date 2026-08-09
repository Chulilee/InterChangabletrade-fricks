import {
  RouterConfig,
  RoutingPlan,
  RoutingPlanLeg,
  VenueAdapter,
  RoutingStrategy,
  IdempotencyRecord,
  ReconciliationTask,
  RetryPolicy,
} from './types';
import { Order, Fill, TradeEvent, OrderStatus } from '@/types/trading';
import { SplitEqualStrategy } from './strategies/splitEqualStrategy';

/**
 * Main OrderRouter class that implements the routing layer
 */
export class OrderRouter {
  private config: RouterConfig;
  private adapters: Map<string, VenueAdapter> = new Map();
  private plans: Map<string, RoutingPlan> = new Map();
  private idempotencyRecords: Map<string, IdempotencyRecord> = new Map();
  private reconciliationTasks: Map<string, ReconciliationTask> = new Map();
  private reconciliationInterval?: NodeJS.Timeout;
  private strategies: Map<string, RoutingStrategy> = new Map();
  private defaultStrategy: RoutingStrategy;
  private eventHandlers: ((event: TradeEvent & { planId: string; legId?: string }) => void)[] = [];

  constructor(config: RouterConfig) {
    this.config = config;
    this.defaultStrategy = new SplitEqualStrategy();
    
    // Register default strategy
    this.registerStrategy('split-equal', this.defaultStrategy);
    
    // Start reconciliation loop
    this.startReconciliation();
  }

  /**
   * Register a venue adapter
   */
  registerAdapter(adapter: VenueAdapter): void {
    this.adapters.set(adapter.getVenueId(), adapter);
  }

  /**
   * Register a routing strategy
   */
  registerStrategy(name: string, strategy: RoutingStrategy): void {
    this.strategies.set(name, strategy);
  }

  /**
   * Subscribe to router events
   */
  onEvent(handler: (event: TradeEvent & { planId: string; legId?: string }) => void): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Emit an event
   */
  private emit(event: TradeEvent & { planId: string; legId?: string }): void {
    this.eventHandlers.forEach(handler => handler(event));
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate idempotency key
   */
  private generateIdempotencyKey(orderId: string, legId: string): string {
    return `idem_${orderId}_${legId}_${Date.now()}`;
  }

  /**
   * Calculate backoff delay using exponential backoff
   */
  private calculateBackoff(attempt: number, retryPolicy: RetryPolicy): number {
    const delay = Math.min(
      retryPolicy.initialBackoffMs * Math.pow(retryPolicy.backoffMultiplier, attempt),
      retryPolicy.maxBackoffMs
    );
    return delay;
  }

  /**
   * Build a routing plan for an order
   */
  buildRoutingPlan(order: Order, strategyName?: string): RoutingPlan {
    // Get available venues that are enabled
    const availableVenues = this.config.venues.filter(v => v.enabled);
    
    if (availableVenues.length === 0) {
      throw new Error('No enabled venues available for routing');
    }

    // Get the routing strategy
    const strategy = strategyName 
      ? this.strategies.get(strategyName) || this.defaultStrategy
      : this.defaultStrategy;

    // Build legs using the strategy
    const legs = strategy.buildPlan(order, availableVenues);

    if (legs.length === 0) {
      throw new Error('Failed to create any routing legs for the order');
    }

    // Create the complete plan
    const plan: RoutingPlan = {
      planId: this.generateId(),
      originalOrder: order,
      legs,
      status: 'building',
      totalFilled: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.plans.set(plan.planId, plan);
    return plan;
  }

  /**
   * Execute a routing plan
   */
  async executePlan(plan: RoutingPlan): Promise<{ success: boolean; planId: string; errors?: string[] }> {
    const planToExecute = this.plans.get(plan.planId);
    if (!planToExecute) {
      throw new Error(`Plan ${plan.planId} not found`);
    }

    planToExecute.status = 'executing';
    planToExecute.updatedAt = Date.now();
    this.plans.set(plan.planId, planToExecute);

    const errors: string[] = [];

    // Submit each leg to its respective venue
    const submissionPromises = planToExecute.legs.map(async (leg) => {
      try {
        return await this.submitLeg(planToExecute, leg);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Leg ${leg.legId}: ${errorMessage}`);
        leg.status = 'failed';
        leg.error = errorMessage;
        return { success: false, error: errorMessage };
      }
    });

    const results = await Promise.allSettled(submissionPromises);
    const allFailed = results.every(r => r.status === 'rejected' || (r.value && !r.value.success));

    if (allFailed) {
      planToExecute.status = 'failed';
    } else if (results.some(r => r.status === 'fulfilled' && r.value?.success)) {
      planToExecute.status = 'partial_complete';
    }

    planToExecute.updatedAt = Date.now();
    this.plans.set(plan.planId, planToExecute);

    return {
      success: !allFailed,
      planId: plan.planId,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Submit a single leg to its venue
   */
  private async submitLeg(plan: RoutingPlan, leg: RoutingPlanLeg): Promise<{ success: boolean; error?: string }> {
    const adapter = this.adapters.get(leg.destination.venueId);
    if (!adapter) {
      throw new Error(`No adapter found for venue ${leg.destination.venueId}`);
    }

    // Check if venue is available
    const isAvailable = await adapter.isAvailable();
    if (!isAvailable) {
      throw new Error(`Venue ${leg.destination.venueId} is unavailable`);
    }

    // Create idempotency key
    const idempotencyKey = this.generateIdempotencyKey(plan.originalOrder.id, leg.legId);
    
    // Check if this leg was already processed
    if (this.idempotencyRecords.has(idempotencyKey)) {
      const record = this.idempotencyRecords.get(idempotencyKey)!;
      leg.destination.orderId = record.orderId;
      return { success: true };
    }

    // Submit the order to the venue
    const orderToSubmit = {
      ...plan.originalOrder,
      quantity: leg.destination.quantity,
    };

    const result = await adapter.sendOrder(orderToSubmit, idempotencyKey);

    if (!result.success || !result.orderId) {
      throw new Error(result.error || 'Failed to submit order to venue');
    }

    // Store the external order ID
    leg.destination.orderId = result.orderId;
    leg.status = 'submitted';
    leg.attempts = 1;
    leg.lastAttemptAt = Date.now();

    // Save idempotency record
    this.idempotencyRecords.set(idempotencyKey, {
      key: idempotencyKey,
      orderId: result.orderId,
      processedAt: Date.now(),
      result,
    });

    // Create reconciliation task for external venues
    if (leg.destination.venueType === 'external') {
      this.reconciliationTasks.set(`${plan.planId}_${leg.legId}`, {
        planId: plan.planId,
        legId: leg.legId,
        venueId: leg.destination.venueId,
        externalOrderId: result.orderId,
        nextReconciliationAt: Date.now() + 1000, // Check again in 1 second
        attempts: 0,
      });
    }

    // Emit order accepted event
    this.emit({
      type: 'order_accepted',
      orderId: plan.originalOrder.id,
      planId: plan.planId,
      legId: leg.legId,
      side: plan.originalOrder.side,
      price: plan.originalOrder.price,
      quantity: leg.destination.quantity,
      remaining: leg.remaining,
      timestamp: Date.now(),
    });

    plan.updatedAt = Date.now();
    this.plans.set(plan.planId, plan);

    return { success: true };
  }

  /**
   * Start the reconciliation loop
   */
  private startReconciliation(): void {
    this.reconciliationInterval = setInterval(() => {
      this.reconcileAll();
    }, this.config.reconciliationIntervalMs);
  }

  /**
   * Reconcile all pending tasks
   */
  private async reconcileAll(): Promise<void> {
    const now = Date.now();
    const tasksToProcess = Array.from(this.reconciliationTasks.values())
      .filter(task => task.nextReconciliationAt <= now);

    for (const task of tasksToProcess) {
      await this.reconcileTask(task);
    }
  }

  /**
   * Reconcile a single task
   */
  private async reconcileTask(task: ReconciliationTask): Promise<void> {
    const plan = this.plans.get(task.planId);
    const leg = plan?.legs.find(l => l.legId === task.legId);
    const adapter = this.adapters.get(task.venueId);

    if (!plan || !leg || !adapter) {
      this.reconciliationTasks.delete(`${task.planId}_${task.legId}`);
      return;
    }

    try {
      const status = await adapter.getStatus(task.externalOrderId);
      
      if (!status.success) {
        // Handle failure - retry if needed
        await this.handleReconciliationFailure(task, leg, plan, status.error);
        return;
      }

      // Update leg with latest status
      this.updateLegFromStatus(leg, status, plan);

      // If order is still open, schedule next reconciliation
      if (status.status === 'open' || status.status === 'partial_fill' || status.status === 'pending') {
        task.nextReconciliationAt = Date.now() + 2000; // Check again in 2 seconds
        task.attempts++;
        this.reconciliationTasks.set(`${task.planId}_${task.legId}`, task);
      } else {
        // Order is complete, remove from reconciliation
        this.reconciliationTasks.delete(`${task.planId}_${task.legId}`);
        
        // Check if entire plan is complete
        this.checkPlanCompletion(plan);
      }
    } catch (error) {
      await this.handleReconciliationFailure(task, leg, plan, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Handle reconciliation failures
   */
  private async handleReconciliationFailure(
    task: ReconciliationTask,
    leg: RoutingPlanLeg,
    plan: RoutingPlan,
    error?: string
  ): Promise<void> {
    const retryPolicy = this.config.retryPolicy;
    task.attempts++;

    if (task.attempts < retryPolicy.maxRetries) {
      // Retry with backoff
      const backoff = this.calculateBackoff(task.attempts, retryPolicy);
      task.nextReconciliationAt = Date.now() + backoff;
      this.reconciliationTasks.set(`${task.planId}_${task.legId}`, task);
    } else {
      // Max retries exceeded, mark as failed
      leg.status = 'failed';
      leg.error = error || 'Max reconciliation attempts exceeded';
      this.reconciliationTasks.delete(`${task.planId}_${task.legId}`);
      
      // Check if we need to failover to another venue
      if (this.config.enableFailover) {
        await this.attemptFailover(leg, plan);
      } else {
        this.checkPlanCompletion(plan);
      }
    }
  }

  /**
   * Attempt to failover a failed leg to another available venue
   */
  private async attemptFailover(leg: RoutingPlanLeg, plan: RoutingPlan): Promise<void> {
    // Find another available venue that's not the current one
    const alternativeVenue = this.config.venues.find(v => 
      v.enabled && v.id !== leg.destination.venueId
    );

    if (!alternativeVenue) {
      this.checkPlanCompletion(plan);
      return;
    }

    // Create a new leg for the failover
    const newLeg: RoutingPlanLeg = {
      legId: `leg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      destination: {
        venueId: alternativeVenue.id,
        venueType: alternativeVenue.type,
        quantity: leg.remaining,
      },
      status: 'pending',
      filled: 0,
      remaining: leg.remaining,
      fills: [],
      attempts: 0,
    };

    plan.legs.push(newLeg);
    
    // Submit the new leg
    try {
      await this.submitLeg(plan, newLeg);
    } catch (error) {
      newLeg.status = 'failed';
      newLeg.error = error instanceof Error ? error.message : 'Failed to submit failover order';
      this.checkPlanCompletion(plan);
    }
  }

  /**
   * Update a leg's state from venue status
   */
  private updateLegFromStatus(
    leg: RoutingPlanLeg,
    status: { status?: OrderStatus; filled?: number; remaining?: number; fills?: Fill[] },
    plan: RoutingPlan
  ): void {
    leg.status = status.status ?? leg.status;
    leg.filled = status.filled ?? leg.filled;
    leg.remaining = status.remaining ?? leg.remaining;

    if (status.fills) {
      // Add any new fills
      const existingFillIds = new Set(leg.fills.map(f => f.id));
      const newFills = status.fills.filter((f: Fill) => !existingFillIds.has(f.id));
      leg.fills.push(...newFills);

      // Emit events for new fills
      newFills.forEach((fill: Fill) => {
        this.emit({
          type: leg.remaining > 0 ? 'order_partial_fill' : 'order_filled',
          orderId: plan.originalOrder.id,
          planId: plan.planId,
          legId: leg.legId,
          side: fill.side,
          price: fill.price,
          quantity: fill.quantity,
          remaining: leg.remaining,
          timestamp: fill.timestamp,
        });
      });
    }

    // Update plan totals
    plan.totalFilled = plan.legs.reduce((sum, l) => sum + l.filled, 0);
    plan.updatedAt = Date.now();
    this.plans.set(plan.planId, plan);
  }

  /**
   * Check if the entire plan is complete
   */
  private checkPlanCompletion(plan: RoutingPlan): void {
    const allLegsComplete = plan.legs.every(leg => 
      leg.status === 'filled' || leg.status === 'cancelled' || leg.status === 'failed'
    );

    if (allLegsComplete) {
      const allLegsFailed = plan.legs.every(leg => leg.status === 'failed');
      
      if (allLegsFailed) {
        plan.status = 'failed';
      } else if (plan.totalFilled >= plan.originalOrder.quantity) {
        plan.status = 'complete';
      } else {
        plan.status = 'partial_complete';
      }

      plan.updatedAt = Date.now();
      this.plans.set(plan.planId, plan);
    }
  }

  /**
   * Get a plan by ID
   */
  getPlan(planId: string): RoutingPlan | undefined {
    return this.plans.get(planId);
  }

  /**
   * Get all plans
   */
  getAllPlans(): RoutingPlan[] {
    return Array.from(this.plans.values());
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.reconciliationInterval) {
      clearInterval(this.reconciliationInterval);
    }
    this.plans.clear();
    this.idempotencyRecords.clear();
    this.reconciliationTasks.clear();
    this.adapters.clear();
    this.eventHandlers = [];
  }
}