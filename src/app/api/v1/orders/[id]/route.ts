import { NextRequest, NextResponse } from 'next/server';
import {
  validateApiKey,
  hasPermission,
  createErrorResponse,
  createSuccessResponse,
  computeETag,
} from '@/lib/api-middleware';
import { enforceApiRateLimit } from '@/lib/api-rate-limit';
import { getTradingEngine } from '@/lib/trading-instance';

const ORDER_STATUS_CACHE_TTL_SECONDS = 2;

/**
 * @openapi
 * /api/v1/orders/{id}:
 *   get:
 *     summary: Get order status
 *     description: |
 *       Retrieves the current status and details of a specific order.
 *
 *       **Caching (polling):** Responses include `Cache-Control: private, max-age=2`
 *       and an `ETag` derived from the order status payload. Clients polling this
 *       endpoint should send `If-None-Match` with the previous `ETag` to receive
 *       `304 Not Modified` when the order has not changed.
 *
 *       **Polling vs WebSocket:** Short-interval polling is acceptable for simple
 *       clients, but for real-time fill/status updates prefer a WebSocket or
 *       server-sent event stream when available. Polling at intervals shorter than
 *       the cache TTL provides little benefit and increases load.
 *     tags:
 *       - Orders
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The unique identifier of the order
 *         schema:
 *           type: string
 *           example: "ord_1234567890_abc123def"
 *     responses:
 *       200:
 *         description: Order status retrieved successfully
 *         headers:
 *           Cache-Control:
 *             description: Short private cache for polling clients (max-age=2)
 *             schema:
 *               type: string
 *           ETag:
 *             description: Hash of the order status payload for conditional requests
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [pending, open, partial_fill, filled, cancelled]
 *                     filled:
 *                       type: number
 *                     remaining:
 *                       type: number
 *                     fills:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           price:
 *                             type: number
 *                           quantity:
 *                             type: number
 *                           timestamp:
 *                             type: number
 *       304:
 *         description: Not modified (If-None-Match matched the current ETag)
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *   delete:
 *     summary: Cancel an order
 *     description: Cancels a pending or open order
 *     tags:
 *       - Orders
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The unique identifier of the order to cancel
 *         schema:
 *           type: string
 *           example: "ord_1234567890_abc123def"
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *       400:
 *         description: Order cannot be cancelled (already filled or cancelled)
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await validateApiKey(request);
  if (!authResult.valid) {
    return createErrorResponse(401, 'Unauthorized', authResult.error);
  }
  if (!hasPermission(authResult, 'orders', 'read')) {
    return createErrorResponse(403, 'Forbidden', { required: 'orders:read' });
  }

  const engine = getTradingEngine();
  const orderStatus = engine.getOrderStatus(id);

  if (!orderStatus) {
    return createErrorResponse(404, 'Order not found');
  }

  const etag = computeETag(orderStatus);
  const cacheControl = `private, max-age=${ORDER_STATUS_CACHE_TTL_SECONDS}`;
  const ifNoneMatch = request.headers.get('if-none-match');
  if (ifNoneMatch && ifNoneMatch.split(',').map((value) => value.trim()).includes(etag)) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        'Cache-Control': cacheControl,
        ETag: etag,
        Vary: 'x-api-key',
      },
    });
  }

  const response = createSuccessResponse(orderStatus, { apiVersion: 'v1' });
  response.headers.set('Cache-Control', cacheControl);
  response.headers.set('ETag', etag);
  response.headers.set('Vary', 'x-api-key');
  return response;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await validateApiKey(request);
  if (!authResult.valid) {
    return createErrorResponse(401, 'Unauthorized', authResult.error);
  }
  if (!hasPermission(authResult, 'orders', 'cancel')) {
    return createErrorResponse(403, 'Forbidden', { required: 'orders:cancel' });
  }
  const limited = enforceApiRateLimit(request, 'orders:cancel', authResult.clientId);
  if (limited) {
    return limited;
  }

  const engine = getTradingEngine();
  const success = engine.cancelOrder(id);

  if (!success) {
    // Check if order exists to provide better error message
    const orderExists = engine.getOrderStatus(id);
    if (!orderExists) {
      return createErrorResponse(404, 'Order not found');
    }
    return createErrorResponse(400, 'Order cannot be cancelled (already filled or cancelled)');
  }

  return createSuccessResponse(
    { success: true, message: 'Order cancelled successfully' },
    { apiVersion: 'v1' }
  );
}