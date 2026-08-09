import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, createErrorResponse, createSuccessResponse } from '@/lib/api-middleware';
import { getTradingEngine } from '@/lib/trading-instance';

/**
 * @openapi
 * /api/v1/orders/{id}:
 *   get:
 *     summary: Get order status
 *     description: Retrieves the current status and details of a specific order
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
  const authResult = validateApiKey(request);
  if (!authResult.valid) {
    return createErrorResponse(401, 'Unauthorized', authResult.error);
  }

  const engine = getTradingEngine();
  const orderStatus = engine.getOrderStatus(id);

  if (!orderStatus) {
    return createErrorResponse(404, 'Order not found');
  }

  return createSuccessResponse(orderStatus, { apiVersion: 'v1' });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = validateApiKey(request);
  if (!authResult.valid) {
    return createErrorResponse(401, 'Unauthorized', authResult.error);
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