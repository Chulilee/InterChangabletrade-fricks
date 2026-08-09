import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, createErrorResponse, createSuccessResponse } from '@/lib/api-middleware';
import { getTradingEngine } from '@/lib/trading-instance';

/**
 * @openapi
 * /api/v1/markets/{pair}/book:
 *   get:
 *     summary: Get order book snapshot
 *     description: Retrieves the current order book snapshot for a trading pair
 *     tags:
 *       - Market Data
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: pair
 *         in: path
 *         required: true
 *         description: Trading pair symbol
 *         schema:
 *           type: string
 *           example: "BTC/USDT"
 *       - name: depth
 *         in: query
 *         required: false
 *         description: Number of order levels to return (default: 20, max: 100)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Order book snapshot retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     pair:
 *                       type: string
 *                     bids:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           price:
 *                             type: number
 *                           quantity:
 *                             type: number
 *                           orderCount:
 *                             type: integer
 *                     asks:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           price:
 *                             type: number
 *                           quantity:
 *                             type: number
 *                           orderCount:
 *                             type: integer
 *                     lastUpdate:
 *                       type: number
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pair: string }> }
) {
  const { pair } = await params;
  const authResult = validateApiKey(request);
  if (!authResult.valid) {
    return createErrorResponse(401, 'Unauthorized', authResult.error);
  }

  const { searchParams } = new URL(request.url);
  const depthParam = searchParams.get('depth');
  const depth = depthParam ? parseInt(depthParam, 10) : 20;

  // Validate depth parameter
  if (isNaN(depth) || depth < 1 || depth > 100) {
    return createErrorResponse(400, 'Invalid depth parameter', {
      min: 1,
      max: 100,
      received: depthParam,
    });
  }

  const engine = getTradingEngine();
  const orderBook = engine.getOrderBook(pair, depth);

  return createSuccessResponse(orderBook, { 
    apiVersion: 'v1',
    depth: orderBook.bids.length + orderBook.asks.length
  });
}