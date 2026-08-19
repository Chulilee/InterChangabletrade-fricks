export interface OrderDetails {
  amount: number;
  currency: string;
  description: string;
  metadata?: Record<string, any>;
}
