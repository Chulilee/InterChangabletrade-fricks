# Payment Integration

This document provides instructions for integrating a real payment provider and testing webhooks.

## Integrating a Real Payment Provider

To integrate a real payment provider, you need to create a new class that implements the `PaymentProvider` interface from `src/services/paymentService.ts`. This class should handle the communication with the payment provider's API.

Once you have created your payment provider class, you need to update the `src/app/api/v1/payments/route.ts` and `src/app/api/v1/payments/webhook/route.ts` files to use your new provider instead of the `MockPaymentProvider`.

## Testing Webhooks

To test webhooks, you can use a tool like [ngrok](https://ngrok.com/) to expose your local webhook endpoint to the internet. Once you have a public URL for your webhook endpoint, you can configure your payment provider to send webhook events to this URL.

When a webhook event is received, the `handleWebhook` method of your payment provider class will be called. You can add logging to this method to inspect the payload of the webhook event.
