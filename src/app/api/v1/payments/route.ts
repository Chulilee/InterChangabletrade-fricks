import { NextResponse } from "next/server";
import { PaymentService } from "@/services/paymentService";
import { MockPaymentProvider } from "@/mocks/mockPaymentProvider";
import { OrderDetails } from "@/types/order";
import { enforceApiRateLimit } from "@/lib/api-rate-limit";

const paymentService = new PaymentService(new MockPaymentProvider());

export async function POST(request: Request) {
  const limited = enforceApiRateLimit(request, "payments:create");
  if (limited) {
    return limited;
  }
  const orderDetails: OrderDetails = await request.json();
  const paymentIntent = await paymentService.createPaymentIntent(orderDetails);
  return NextResponse.json(paymentIntent);
}
