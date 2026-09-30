import {
  Order,
  OrderSide,
  OrderType,
  OrderBook,
  OrderBookLevel,
  Fill,
  TradeEvent,
  OrderStatusResponse,
} from '@/types/trading';

type EventHandler = (event: TradeEvent) => void;

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class TradingEngine {
  private orderBooks: Map<string, Order[]> = new Map();
  private orders: Map<string, Order> = new Map();
  private fills: Map<string, Fill[]> = new Map();
  private trades: Map<string, Fill[]> = new Map(); // Historical trades per pair
  private eventHandlers: EventHandler[] = [];
  private rateLimits: Map<string, RateLimitEntry> = new Map();

  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly MAX_ORDERS_PER_MINUTE = 100;

  onEvent(handler: EventHandler): void {
    this.eventHandlers.push(handler);
  }

  removeEventHandler(handler: EventHandler): void {
    this.eventHandlers = this.eventHandlers.filter((h) => h !== handler);
  }

  private emit(event: TradeEvent): void {
    this.eventHandlers.forEach((handler) => handler(event));
  }

  private checkRateLimit(clientId: string): boolean {
    const now = Date.now();
    const entry = this.rateLimits.get(clientId);

    if (!entry || now > entry.resetTime) {
      this.rateLimits.set(clientId, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW,
      });
      return true;
    }

    if (entry.count >= this.MAX_ORDERS_PER_MINUTE) {
      return false;
    }

    entry.count++;
    return true;
  }

  private generateId(): string {
    return `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFillId(): string {
    return `fill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getRawOrderBook(pair: string): Order[] {
    if (!this.orderBooks.has(pair)) {
      this.orderBooks.set(pair, []);
    }
    return this.orderBooks.get(pair)!;
  }

  private addToOrderBook(order: Order): void {
    const book = this.getRawOrderBook(order.pair);
    const insertIndex = book.findIndex((o) => {
      if (order.side === 'buy') {
        return o.price < order.price;
      }
      return o.price > order.price;
    });

    if (insertIndex === -1) {
      book.push(order);
    } else {
      book.splice(insertIndex, 0, order);
    }
  }

  private removeFromOrderBook(order: Order): void {
    const book = this.getRawOrderBook(order.pair);
    const index = book.findIndex((o) => o.id === order.id);
    if (index !== -1) {
      book.splice(index, 1);
    }
  }

  private validateOrder(order: Partial<Order>): order is Order {
    if (!order.pair || !order.side || !order.type || !order.price || !order.quantity || !order.clientId) {
      return false;
    }

    if (order.type === 'limit' && order.price <= 0) {
      return false;
    }

    if (order.quantity <= 0) {
      return false;
    }

    return true;
  }

  submitOrder(params: {
    pair: string;
    side: OrderSide;
    type: OrderType;
    price: number;
    quantity: number;
    clientId: string;
  }): Order | null {
    if (!this.checkRateLimit(params.clientId)) {
      return null;
    }

    const order: Order = {
      id: this.generateId(),
      pair: params.pair,
      side: params.side,
      type: params.type,
      price: params.price,
      quantity: params.quantity,
      filled: 0,
      remaining: params.quantity,
      status: 'pending',
      clientId: params.clientId,
      timestamp: Date.now(),
    };

    if (!this.validateOrder(order)) {
      return null;
    }

    this.orders.set(order.id, order);
    this.fills.set(order.id, []);

    this.emit({
      type: 'order_accepted',
      orderId: order.id,
      side: order.side,
      price: order.price,
      quantity: order.quantity,
      remaining: order.remaining,
      timestamp: order.timestamp,
    });

    this.matchOrder(order);

    return order;
  }

  /**
   * Snapshot the resting orders an incoming order is allowed to trade against.
   *
   * The snapshot is taken up front, in book order (which is price-priority
   * order), and stops at the first opposite-side order that the incoming limit
   * price does not cross. Working from a stable list means the caller can fill
   * makers back to back without its cursor being invalidated by the splices
   * those fills perform on the live book.
   */
  private collectMatches(incomingOrder: Order): Order[] {
    const book = this.getRawOrderBook(incomingOrder.pair);
    const isBuy = incomingOrder.side === 'buy';
    const candidates: Order[] = [];

    for (const restingOrder of book) {
      if (restingOrder.side === incomingOrder.side) {
        continue;
      }

      if (incomingOrder.type === 'limit') {
        if (isBuy && incomingOrder.price < restingOrder.price) {
          break;
        }
        if (!isBuy && incomingOrder.price > restingOrder.price) {
          break;
        }
      }

      candidates.push(restingOrder);
    }

    return candidates;
  }

  /**
   * Fill an incoming order against the resting book, then park whatever is
   * left over.
   *
   * Invariants this method relies on, and that any change here must preserve:
   *
   * 1. The maker set is resolved by `collectMatches` *before* the first fill.
   *    `applyFill` splices an exhausted maker out of the live book array, which
   *    shifts every later element one slot down. Walking that same array by
   *    index while mutating it made the cursor step over the resting order that
   *    had just moved into the slot it was about to read, so the sweep silently
   *    skipped a maker on every removal.
   * 2. A maker is visited at most once per incoming order, so no maker can be
   *    filled twice out of a single sweep.
   * 3. The loop stops as soon as the incoming order is exhausted; a limit order
   *    never crosses a worse price than its own limit, and a market order never
   *    walks past the end of the book.
   * 4. A level left with nothing to fill is retired rather than filled, so the
   *    book never publishes a zero-quantity level and the trade tape never
   *    carries a zero-quantity print.
   * 5. Whatever quantity is left unfilled is only published back to the book
   *    for limit orders, and it is published exactly once.
   */
  private matchOrder(incomingOrder: Order): void {
    const candidates = this.collectMatches(incomingOrder);

    for (const restingOrder of candidates) {
      if (incomingOrder.remaining <= 0) {
        break;
      }

      // A level can be left sitting in the book with nothing left to fill when
      // it was settled by some other path first (a cancel that overlapped the
      // sweep, say). Retiring it here keeps dead levels out of the book instead
      // of writing a zero-quantity fill against them.
      if (restingOrder.remaining <= 0) {
        restingOrder.status = 'filled';
        this.removeFromOrderBook(restingOrder);
        continue;
      }

      this.applyFill(incomingOrder, restingOrder);
    }

    if (incomingOrder.remaining === 0) {
      incomingOrder.status = 'filled';
      this.emit({
        type: 'order_filled',
        orderId: incomingOrder.id,
        side: incomingOrder.side,
        price: incomingOrder.price,
        quantity: incomingOrder.quantity,
        remaining: 0,
        timestamp: Date.now(),
      });
    } else if (incomingOrder.filled > 0) {
      incomingOrder.status = 'partial_fill';
      this.emit({
        type: 'order_partial_fill',
        orderId: incomingOrder.id,
        side: incomingOrder.side,
        price: incomingOrder.price,
        quantity: incomingOrder.filled,
        remaining: incomingOrder.remaining,
        timestamp: Date.now(),
      });

      if (incomingOrder.type === 'limit') {
        this.addToOrderBook(incomingOrder);
      }
    } else {
      if (incomingOrder.type === 'limit') {
        incomingOrder.status = 'open';
        this.addToOrderBook(incomingOrder);
      } else {
        incomingOrder.status = 'filled';
      }
    }
  }

  /**
   * Record a single maker fill against the incoming order.
   *
   * Owns everything that happens once a maker has been selected: fill
   * creation, trade-tape bookkeeping, quantity updates on both sides, the
   * maker's status transition and the removal of an exhausted maker from the
   * book. Returns `true` when the maker was fully consumed and therefore
   * unlinked from the order book.
   */
  private applyFill(incomingOrder: Order, restingOrder: Order): boolean {
    const matchQuantity = Math.min(
      incomingOrder.remaining,
      restingOrder.remaining,
    );
    const matchPrice = restingOrder.price;

    const fill: Fill = {
      id: this.generateFillId(),
      orderId: incomingOrder.id,
      makerOrderId: restingOrder.id,
      pair: incomingOrder.pair,
      side: incomingOrder.side,
      price: matchPrice,
      quantity: matchQuantity,
      timestamp: Date.now(),
    };

    this.fills.get(incomingOrder.id)!.push(fill);
    this.fills.get(restingOrder.id)!.push(fill);

    // Add to historical trades for the pair
    if (!this.trades.has(incomingOrder.pair)) {
      this.trades.set(incomingOrder.pair, []);
    }
    this.trades.get(incomingOrder.pair)!.push(fill);

    incomingOrder.filled += matchQuantity;
    incomingOrder.remaining -= matchQuantity;
    restingOrder.filled += matchQuantity;
    restingOrder.remaining -= matchQuantity;

    if (restingOrder.remaining === 0) {
      restingOrder.status = 'filled';
      this.removeFromOrderBook(restingOrder);
      this.emit({
        type: 'order_filled',
        orderId: restingOrder.id,
        side: restingOrder.side,
        price: matchPrice,
        quantity: restingOrder.quantity,
        remaining: 0,
        timestamp: Date.now(),
      });
      return true;
    }

    restingOrder.status = 'partial_fill';
    this.emit({
      type: 'order_partial_fill',
      orderId: restingOrder.id,
      side: restingOrder.side,
      price: matchPrice,
      quantity: matchQuantity,
      remaining: restingOrder.remaining,
      timestamp: Date.now(),
    });
    return false;
  }

  cancelOrder(orderId: string): boolean {
    const order = this.orders.get(orderId);
    if (!order) {
      return false;
    }

    if (order.status === 'filled') {
      return false;
    }

    if (order.status === 'open' || order.status === 'partial_fill') {
      this.removeFromOrderBook(order);
    }

    order.status = 'cancelled';
    order.remaining = 0;

    this.emit({
      type: 'order_cancelled',
      orderId: order.id,
      side: order.side,
      price: order.price,
      quantity: order.quantity,
      remaining: 0,
      timestamp: Date.now(),
    });

    return true;
  }

  getOrderStatus(orderId: string): OrderStatusResponse | null {
    const order = this.orders.get(orderId);
    if (!order) {
      return null;
    }

    return {
      orderId: order.id,
      status: order.status,
      filled: order.filled,
      remaining: order.remaining,
      fills: this.fills.get(orderId) || [],
    };
  }

  getOrderBook(pair: string, depth: number = 20): OrderBook {
    const book = this.getRawOrderBook(pair);
    const bidMap: Map<number, OrderBookLevel> = new Map();
    const askMap: Map<number, OrderBookLevel> = new Map();

    for (const order of book) {
      const map = order.side === 'buy' ? bidMap : askMap;
      const existing = map.get(order.price);

      if (existing) {
        existing.quantity += order.remaining;
        existing.orderCount++;
      } else {
        map.set(order.price, {
          price: order.price,
          quantity: order.remaining,
          orderCount: 1,
        });
      }
    }

    const bids = Array.from(bidMap.values())
      .sort((a, b) => b.price - a.price)
      .slice(0, depth);

    const asks = Array.from(askMap.values())
      .sort((a, b) => a.price - b.price)
      .slice(0, depth);

    return {
      pair,
      bids,
      asks,
      lastUpdate: Date.now(),
    };
  }

  getMetrics(pair: string): {
    ordersPerSecond: number;
    totalOrders: number;
    totalFills: number;
  } {
    const pairOrders = Array.from(this.orders.values()).filter(
      (o) => o.pair === pair,
    );
    const pairFills = Array.from(this.fills.entries())
      .filter(([orderId]) => {
        const order = this.orders.get(orderId);
        return order?.pair === pair;
      })
      .flatMap(([, fills]) => fills);

    const recentOrders = pairOrders.filter(
      (o) => Date.now() - o.timestamp < 1000,
    );

    return {
      ordersPerSecond: recentOrders.length,
      totalOrders: pairOrders.length,
      totalFills: pairFills.length,
    };
  }

  getTrades(pair: string, page: number = 1, limit: number = 50): {
    trades: Fill[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } {
    const pairTrades = this.trades.get(pair) || [];
    
    // Sort trades by timestamp descending (newest first)
    const sortedTrades = [...pairTrades].sort((a, b) => b.timestamp - a.timestamp);
    
    const total = sortedTrades.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTrades = sortedTrades.slice(startIndex, endIndex);

    return {
      trades: paginatedTrades,
      total,
      page,
      limit,
      totalPages,
    };
  }
}