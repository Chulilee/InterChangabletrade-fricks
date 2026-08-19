import { OrderDetails } from "@/types/order";

export interface PaymentProvider {
  createPaymentIntent(orderDetails: OrderDetails): Promise<PaymentIntent>;
  handleWebhook(payload: any): Promise<boolean>;
}

export interface PaymentIntent {
  clientSecret: string;
  status:
    | "requires_payment_method"
    | "requires_confirmation"
    | "processing"
    | "succeeded"
    | "canceled";
}

export class PaymentService {
  private provider: PaymentProvider;

  constructor(provider: PaymentProvider) {
    this.provider = provider;
  }

  async createPaymentIntent(
    orderDetails: OrderDetails,
  ): Promise<PaymentIntent> {
    return this.provider.createPaymentIntent(orderDetails);
  }

  async handleWebhook(payload: any): Promise<boolean> {
    return this.provider.handleWebhook(payload);
  }
}
