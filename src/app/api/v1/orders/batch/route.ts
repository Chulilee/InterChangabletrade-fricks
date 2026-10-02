import { NextRequest } from 'next/server';
import { validateApiKey, hasPermission, createErrorResponse, createSuccessResponse } from '@/lib/api-middleware';
import { getTradingEngine } from '@/lib/trading-instance';
import { OrderSide, OrderType } from '@/types/trading';

/**
 * @openapi
 * /api/v1/orders/batch:
 *   post:
 *     summary: Submit multiple orders as a batch
 *     description: Creates and submits multiple trading orders atomically with a single rate limit check
 *     tags:
 *       - Orders
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orders
 *             properties:
 *               orders:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 100
 *                 items:
 *                   type: object
 *                   required:
 *                     - pair
 *                     - side
 *                     - type
 *                     - price
 *                     - quantity
 *                   properties:
 *                     pair:
 *                       type: string
 *                       example: "BTC/USDT"
 *                       description: Trading pair symbol
 *                     side:
 *                       type: string
 *                       enum: [buy, sell]
 *                       example: "buy"
 *                       description: Order side (buy or sell)
 *                     type:
 *                       type: string
 *                       enum: [limit, market]
 *                       example: "limit"
 *                       description: Order type (limit or market)
 *                     price:
 *                       type: number
 *                       example: 50000.0
 *                       description: Order price (required for limit orders)
 *                     quantity:
 *                       type: number
 *                       example: 0.1
 *                       description: Order quantity to trade
 *     responses:
 *       201:
 *         description: Batch orders submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           orderId:
 *                             type: string
 *                             example: "ord_1234567890_abc123def"
 *                           status:
 *                             type: string
 *                             example: "pending"
 *                           pair:
 *                             type: string
 *                             example: "BTC/USDT"
 *                           side:
 *                             type: string
 *                             example: "buy"
 *                           price:
 *                             type: number
 *                             example: 50000.0
 *                           quantity:
 *                             type: number
 *                             example: 0.1
 *                           remaining:
 *                             type: number
 *                             example: 0.1
 *                           filled:
 *                             type: number
 *                             example: 0
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(request: NextRequest) {
  // Validate API key and check create permission
  const authResult = await validateApiKey(request);
  if (!authResult.valid) {
    return createErrorResponse(401, 'Unauthorized', authResult.error);
  }
  if (!hasPermission(authResult, 'orders', 'create')) {
    return createErrorResponse(403, 'Forbidden', {
      required: 'orders:create',
    });
  }

  try {
    const body = await request.json();
    const { orders } = body;

    // Validate orders array
    if (!Array.isArray(orders) || orders.length === 0) {
      return createErrorResponse(400, 'Orders array is required and must not be empty');
    }

    if (orders.length > 100) {
      return createErrorResponse(400, 'Maximum 100 orders per batch');
    }

    // Validate each order
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      
      if (!order.pair || !order.side || !order.type || !order.quantity) {
        return createErrorResponse(400, `Order at index ${i}: Missing required fields`, {
          required: ['pair', 'side', 'type', 'quantity', 'price (for limit orders)'],
          index: i,
        });
      }

      if (!['buy', 'sell'].includes(order.side)) {
        return createErrorResponse(400, `Order at index ${i}: Invalid order side`, { valid: ['buy', 'sell'] });
      }

      if (!['limit', 'market'].includes(order.type)) {
        return createErrorResponse(400, `Order at index ${i}: Invalid order type`, { valid: ['limit', 'market'] });
      }

      if (order.type === 'limit' && (!order.price || order.price <= 0)) {
        return createErrorResponse(400, `Order at index ${i}: Valid price is required for limit orders`);
      }

      if (order.quantity <= 0) {
        return createErrorResponse(400, `Order at index ${i}: Quantity must be greater than 0`);
      }
    }

    const engine = getTradingEngine();

    // Prepare orders for batch submission
    const ordersToSubmit = orders.map((order) => ({
      pair: order.pair,
      side: order.side as OrderSide,
      type: order.type as OrderType,
      price: order.price || 0,
      quantity: order.quantity,
      clientId: authResult.clientId!,
    }));

    // Submit batch
    const results = engine.submitOrders(ordersToSubmit);

    // Format response
    const formattedResults = results.map((order, index) => {
      if (!order) {
        return null;
      }
      const originalOrder = orders[index];
      return {
        orderId: order.id,
        status: order.status,
        pair: originalOrder.pair,
        side: originalOrder.side,
        price: originalOrder.price || 0,
        quantity: originalOrder.quantity,
        remaining: order.remaining,
        filled: order.filled,
      };
    });

    return createSuccessResponse(
      {
        results: formattedResults,
        submittedCount: results.filter(r => r !== null).length,
        totalCount: orders.length,
      },
      { apiVersion: 'v1' },
      201
    );
  } catch (error) {
    return createErrorResponse(400, 'Invalid request body', error);
  }
}