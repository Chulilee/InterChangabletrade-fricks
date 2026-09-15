import { NextResponse } from "next/server";
import { PaymentService } from "@/services/paymentService";
import { MockPaymentProvider } from "@/mocks/mockPaymentProvider";

const paymentService = new PaymentService(new MockPaymentProvider());

export async function POST(request: Request) {
  const payload = await request.json();
  const success = await paymentService.handleWebhook(payload);
  return NextResponse.json({ success });
}
