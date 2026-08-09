import { NextRequest } from 'next/server';
import { validateApiKey, createErrorResponse, createSuccessResponse } from '@/lib/api-middleware';
import { getTradingEngine } from '@/lib/trading-instance';

/**
 * @openapi
 * /api/v1/markets/{pair}/trades:
 *   get:
 *     summary: Get recent trades
 *     description: Retrieves paginated list of executed trades for a trading pair
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
 *       - name: page
 *         in: query
 *         required: false
 *         description: Page number for pagination (default: 1)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - name: limit
 *         in: query
 *         required: false
 *         description: Number of trades per page (default: 50, max: 200)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *           default: 50
 *     responses:
 *       200:
 *         description: Trades retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       side:
 *                         type: string
 *                         enum: [buy, sell]
 *                       price:
 *                         type: number
 *                       quantity:
 *                         type: number
 *                       timestamp:
 *                         type: number
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     timestamp:
 *                       type: string
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
  const pageParam = searchParams.get('page');
  const limitParam = searchParams.get('limit');
  
  const page = pageParam ? parseInt(pageParam, 10) : 1;
  const limit = limitParam ? parseInt(limitParam, 10) : 50;

  // Validate pagination parameters
  if (isNaN(page) || page < 1) {
    return createErrorResponse(400, 'Invalid page parameter', {
      min: 1,
      received: pageParam,
    });
  }

  if (isNaN(limit) || limit < 1 || limit > 200) {
    return createErrorResponse(400, 'Invalid limit parameter', {
      min: 1,
      max: 200,
      received: limitParam,
    });
  }

  const engine = getTradingEngine();
  const result = engine.getTrades(pair, page, limit);

  return createSuccessResponse(result.trades, {
    apiVersion: 'v1',
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
  });
}