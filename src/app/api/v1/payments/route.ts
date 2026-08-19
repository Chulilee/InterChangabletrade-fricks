import { NextResponse } from "next/server";
import { PaymentService } from "@/services/paymentService";
import { MockPaymentProvider } from "@/mocks/mockPaymentProvider";
import { OrderDetails } from "@/types/order";

const paymentService = new PaymentService(new MockPaymentProvider());

export async function POST(request: Request) {
  const orderDetails: OrderDetails = await request.json();
  const paymentIntent = await paymentService.createPaymentIntent(orderDetails);
  return NextResponse.json(paymentIntent);
}
