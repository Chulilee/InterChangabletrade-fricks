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

export interface OrderStatusResponse {
  orderId: string;
  status: OrderStatus;
  filled: number;
  remaining: number;
  fills: Fill[];
}
