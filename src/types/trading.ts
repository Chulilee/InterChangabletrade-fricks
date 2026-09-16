export type OrderSide = 'buy' | 'sell';
export type OrderType = 'limit' | 'market';
export type OrderStatus =
  | 'pending'
  | 'open'
  | 'partial_fill'
  | 'filled'
  | 'cancelled';

export interface Order {
  id: string;
  pair: string;
  side: OrderSide;
  type: OrderType;
  price: number;
  quantity: number;
  filled: number;
  remaining: number;
  status: OrderStatus;
  clientId: string;
  timestamp: number;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  orderCount: number;
}

export interface OrderBook {
  pair: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  lastUpdate: number;
}

export interface Fill {
  id: string;
  orderId: string;
  makerOrderId: string;
  pair: string;
  side: OrderSide;
  price: number;
  quantity: number;
  timestamp: number;
}

export interface TradeEvent {
  type:
    | 'order_accepted'
    | 'order_filled'
    | 'order_partial_fill'
    | 'order_cancelled';
  orderId: string;
  side: OrderSide;
  price: number;
  quantity: number;
  remaining: number;
  timestamp: number;
}

/**
 * UI-facing order-book level. Aggregated depth for one price point with
 * running totals; the REST OrderBook-level (types above) is the raw form.
 */
export interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

/** A recent trade as displayed in the ticker tape. */
export interface TradeEntry {
  id: string;
  price: number;
  size: number;
  side: OrderSide;
  time: number;
}

export interface OrderStatusResponse {
  orderId: string;
  status: OrderStatus;
  filled: number;
  remaining: number;
  fills: Fill[];
}
