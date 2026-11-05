import { NextResponse } from "next/server";
import { PaymentService } from "@/services/paymentService";
import { MockPaymentProvider } from "@/mocks/mockPaymentProvider";
import { enforceApiRateLimit } from "@/lib/api-rate-limit";

const paymentService = new PaymentService(new MockPaymentProvider());

export async function POST(request: Request) {
  const limited = enforceApiRateLimit(request, "payments:webhook");
  if (limited) {
    return limited;
  }
  const payload = await request.json();
  const success = await paymentService.handleWebhook(payload);
  return NextResponse.json({ success });
}
