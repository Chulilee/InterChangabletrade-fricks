import { NextRequest } from 'next/server';
import { validateApiKey, hasPermission, createErrorResponse, createSuccessResponse } from '@/lib/api-middleware';
import { getTradingEngine } from '@/lib/trading-instance';
import { getOrderRouter } from '@/lib/order-router/instance';
import { OrderSide, OrderType, Order } from '@/types/trading';

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

    // Route the order through the OrderRouter. With the single internal
    // venue configured it executes against the matching engine; additional
    // venues (split/failover) activate by registering more adapters.
    const engine = getTradingEngine();
    const router = getOrderRouter(engine);

    const draftOrder = {
      pair,
      side: side as OrderSide,
      type: type as OrderType,
      price: price || 0,
      quantity,
      filled: 0,
      remaining: quantity,
      status: 'pending' as const,
      clientId: authResult.clientId!,
      timestamp: Date.now(),
    };

    const plan = router.buildRoutingPlan(draftOrder as Order);
    const result = await router.executePlan(plan);

    if (!result.success) {
      return createErrorResponse(
        429,
        'Order rejected by all venues',
        result.errors,
      );
    }

    // The internal adapter mirrors submitOrder's id semantics; resolve the
    // engine's canonical record so the response exposes final fill state.
    const submittedLeg = plan.legs.find((leg) => leg.destination.orderId);
    const order = submittedLeg?.destination.orderId
      ? engine.getOrderStatus(submittedLeg.destination.orderId)
      : null;

    if (!order) {
      return createErrorResponse(500, 'Order submitted but status unavailable');
    }

    return createSuccessResponse(
      {
        orderId: order.orderId,
        status: order.status,
        pair,
        side,
        price: price || 0,
        quantity,
        remaining: order.remaining,
        filled: order.filled,
        routing: {
          planId: plan.planId,
          legs: plan.legs.map((leg) => ({
            venueId: leg.destination.venueId,
            orderId: leg.destination.orderId,
            quantity: leg.destination.quantity,
            status: leg.status,
          })),
        },
      },
      { apiVersion: 'v1' }
    );
  } catch (error) {
    return createErrorResponse(400, 'Invalid request body', error);
  }
}