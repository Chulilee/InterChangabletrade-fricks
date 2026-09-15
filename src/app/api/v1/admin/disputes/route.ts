import { NextRequest } from 'next/server';
import { requireAdmin, createErrorResponse, createSuccessResponse } from '@/lib/api-middleware';
import { AdminStore } from '@/lib/admin-store';

const store = new AdminStore();

/**
 * @openapi
 * /api/v1/admin/disputes:
 *   get:
 *     summary: List disputes (admin only)
 *     tags: [Admin]
 *     security: [{ ApiKeyAuth: [] }]
 *     responses:
 *       200: { description: Disputes, optionally filtered by ?status=open|resolved }
 *   post:
 *     summary: Resolve a dispute (admin only)
 *     tags: [Admin]
 *     security: [{ ApiKeyAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [disputeId, resolution]
 *             properties:
 *               disputeId: { type: string }
 *               resolution: { type: string }
 *     responses:
 *       200: { description: Resolved dispute }
 */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) {
    return createErrorResponse(guard.error === 'Missing API key' ? 401 : 403, guard.error ?? 'Unauthorized');
  }

  const status = request.nextUrl.searchParams.get('status');
  if (status && status !== 'open' && status !== 'resolved') {
    return createErrorResponse(400, 'Query "status" must be "open" or "resolved"');
  }
  return createSuccessResponse(
    store.listDisputes(status === 'open' || status === 'resolved' ? status : undefined),
    { apiVersion: 'v1' },
  );
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) {
    return createErrorResponse(403, guard.error ?? 'Forbidden');
  }

  let body: { disputeId?: string; resolution?: string };
  try {
    body = await request.json();
  } catch {
    return createErrorResponse(400, 'Invalid JSON body');
  }

  if (!body.disputeId || !body.resolution) {
    return createErrorResponse(400, 'Fields "disputeId" and "resolution" are required');
  }

  const updated = store.resolveDispute(body.disputeId, body.resolution, guard.actor!);
  if (!updated) {
    return createErrorResponse(404, 'Dispute not found or already resolved');
  }
  return createSuccessResponse(updated, { apiVersion: 'v1' });
}
