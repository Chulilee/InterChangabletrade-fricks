import { NextRequest } from 'next/server';
import { requireAdmin, createErrorResponse, createSuccessResponse } from '@/lib/api-middleware';
import { AdminStore } from '@/lib/admin-store';

const store = new AdminStore();

/**
 * @openapi
 * /api/v1/admin/audit-log:
 *   get:
 *     summary: Moderation audit trail / activity feed (admin only)
 *     tags: [Admin]
 *     security: [{ ApiKeyAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *         description: Max entries to return (default 50)
 *     responses:
 *       200: { description: Audit entries, newest first }
 */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) {
    return createErrorResponse(guard.error === 'Missing API key' ? 401 : 403, guard.error ?? 'Unauthorized');
  }

  const rawLimit = request.nextUrl.searchParams.get('limit');
  const limit = rawLimit ? Number.parseInt(rawLimit, 10) : undefined;
  if (rawLimit && (!Number.isFinite(limit) || limit! <= 0)) {
    return createErrorResponse(400, 'Query "limit" must be a positive integer');
  }

  return createSuccessResponse(store.getActivityFeed(limit), { apiVersion: 'v1' });
}
