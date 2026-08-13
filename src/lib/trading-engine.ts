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

  private matchOrder(incomingOrder: Order): void {
    const book = this.getRawOrderBook(incomingOrder.pair);
    const isBuy = incomingOrder.side === 'buy';

    for (let i = 0; i < book.length && incomingOrder.remaining > 0; i++) {
      const restingOrder = book[i];

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
      } else {
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
      }
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