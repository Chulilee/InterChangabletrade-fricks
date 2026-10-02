import { NextRequest } from 'next/server';
import { validateApiKey, hasPermission, createErrorResponse, createSuccessResponse } from '@/lib/api-middleware';
import { getTradingEngine } from '@/lib/trading-instance';
import { OrderStatus } from '@/types/trading';

/**
 * @openapi
 * /api/v1/orders/client:
 *   get:
 *     summary: Get all orders for the authenticated client
 *     description: Returns paginated list of orders for the API key's clientId with optional status filtering
 *     tags:
 *       - Orders
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         description: Filter orders by status
 *         schema:
 *           type: string
 *           enum: [pending, open, partial_fill, filled, cancelled]
 *       - name: page
 *         in: query
 *         description: Page number (1-indexed)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - name: limit
 *         in: query
 *         description: Number of orders per page (max 100)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     orders:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           orderId:
 *                             type: string
 *                             example: "ord_1234567890_abc123def"
 *                           status:
 *                             type: string
 *                             example: "open"
 *                           filled:
 *                             type: number
 *                             example: 0.05
 *                           remaining:
 *                             type: number
 *                             example: 0.05
 *                           fills:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 orderId:
 *                                   type: string
 *                                 makerOrderId:
 *                                   type: string
 *                                 pair:
 *                                   type: string
 *                                 side:
 *                                   type: string
 *                                 price:
 *                                   type: number
 *                                 quantity:
 *                                   type: number
 *                                 timestamp:
 *                                   type: number
 *                     total:
 *                       type: integer
 *                       example: 150
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 50
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
export async function GET(request: NextRequest) {
  // Validate API key
  const authResult = await validateApiKey(request);
  if (!authResult.valid) {
    return createErrorResponse(401, 'Unauthorized', authResult.error);
  }
  if (!hasPermission(authResult, 'orders', 'read')) {
    return createErrorResponse(403, 'Forbidden', {
      required: 'orders:read',
    });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters
    const statusParam = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

    // Validate status if provided
    let status: OrderStatus | undefined;
    if (statusParam) {
      const validStatuses: OrderStatus[] = ['pending', 'open', 'partial_fill', 'filled', 'cancelled'];
      if (!validStatuses.includes(statusParam as OrderStatus)) {
        return createErrorResponse(400, 'Invalid status', { valid: validStatuses });
      }
      status = statusParam as OrderStatus;
    }

    const engine = getTradingEngine();
    const clientId = authResult.clientId!;

    const result = engine.getOrdersByClient(clientId, { status, page, limit });

    return createSuccessResponse(result, { apiVersion: 'v1' });
  } catch (error) {
    return createErrorResponse(500, 'Failed to retrieve orders', error);
  }
}