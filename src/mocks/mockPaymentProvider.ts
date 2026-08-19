import { PaymentProvider, PaymentIntent } from "@/services/paymentService";
import { OrderDetails } from "@/types/order";

export class MockPaymentProvider implements PaymentProvider {
  async createPaymentIntent(
    orderDetails: OrderDetails,
  ): Promise<PaymentIntent> {
    console.log(
      "MockPaymentProvider: Creating payment intent for",
      orderDetails,
    );
    return {
      clientSecret: "mock_client_secret",
      status: "requires_payment_method",
    };
  }

  async handleWebhook(payload: any): Promise<boolean> {
    console.log("MockPaymentProvider: Handling webhook with payload", payload);
    return true;
  }
}
