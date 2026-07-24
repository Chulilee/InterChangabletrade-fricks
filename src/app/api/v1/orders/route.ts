import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, createErrorResponse, createSuccessResponse } from '@/lib/api-middleware';
import { getTradingEngine } from '@/lib/trading-instance';
import { OrderSide, OrderType } from '@/types/trading';

/**
 * @openapi
 * /api/v1/orders:
 *   post:
 *     summary: Submit a new order
 *     description: Creates and submits a new trading order to the exchange
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
 *               - pair
 *               - side
 *               - type
 *               - price
 *               - quantity
 *             properties:
 *               pair:
 *                 type: string
 *                 example: "BTC/USDT"
 *                 description: Trading pair symbol
 *               side:
 *                 type: string
 *                 enum: [buy, sell]
 *                 example: "buy"
 *                 description: Order side (buy or sell)
 *               type:
 *                 type: string
 *                 enum: [limit, market]
 *                 example: "limit"
 *                 description: Order type (limit or market)
 *               price:
 *                 type: number
 *                 example: 50000.0
 *                 description: Order price (required for limit orders)
 *               quantity:
 *                 type: number
 *                 example: 0.1
 *                 description: Order quantity to trade
 *     responses:
 *       201:
 *         description: Order created successfully
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
 *                       example: "ord_1234567890_abc123def"
 *                     status:
 *                       type: string
 *                       example: "pending"
 *                     pair:
 *                       type: string
 *                       example: "BTC/USDT"
 *                     side:
 *                       type: string
 *                       example: "buy"
 *                     price:
 *                       type: number
 *                       example: 50000.0
 *                     quantity:
 *                       type: number
 *                       example: 0.1
 *                     remaining:
 *                       type: number
 *                       example: 0.1
 *                     filled:
 *                       type: number
 *                       example: 0
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(request: NextRequest) {
  // Validate API key
  const authResult = validateApiKey(request);
  if (!authResult.valid) {
    return createErrorResponse(401, 'Unauthorized', authResult.error);
  }

  try {
    const body = await request.json();
    const { pair, side, type, price, quantity } = body;

    // Validate required fields
    if (!pair || !side || !type || !quantity) {
      return createErrorResponse(400, 'Missing required fields', {
        required: ['pair', 'side', 'type', 'quantity', 'price (for limit orders)'],
      });
    }

    // Validate side
    if (!['buy', 'sell'].includes(side)) {
      return createErrorResponse(400, 'Invalid order side', { valid: ['buy', 'sell'] });
    }

    // Validate type
    if (!['limit', 'market'].includes(type)) {
      return createErrorResponse(400, 'Invalid order type', { valid: ['limit', 'market'] });
    }

    // Validate price for limit orders
    if (type === 'limit' && (!price || price <= 0)) {
      return createErrorResponse(400, 'Valid price is required for limit orders');
    }

    // Validate quantity
    if (quantity <= 0) {
      return createErrorResponse(400, 'Quantity must be greater than 0');
    }

    // Submit order to trading engine
    const engine = getTradingEngine();
    const order = engine.submitOrder({
      pair,
      side: side as OrderSide,
      type: type as OrderType,
      price: price || 0,
      quantity,
      clientId: authResult.clientId!,
    });

    if (!order) {
      return createErrorResponse(429, 'Rate limit exceeded or order rejected');
    }

    return createSuccessResponse(
      {
        orderId: order.id,
        status: order.status,
        pair: order.pair,
        side: order.side,
        price: order.price,
        quantity: order.quantity,
        remaining: order.remaining,
        filled: order.filled,
      },
      { apiVersion: 'v1' }
    );
  } catch (error) {
    return createErrorResponse(400, 'Invalid request body', error);
  }
}