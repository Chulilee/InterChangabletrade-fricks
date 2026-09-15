import { NextRequest } from 'next/server';
import { requireAdmin, createErrorResponse, createSuccessResponse } from '@/lib/api-middleware';
import { AdminStore } from '@/lib/admin-store';

const store = new AdminStore();

/**
 * @openapi
 * /api/v1/admin/listings:
 *   get:
 *     summary: Moderation queue - listings awaiting review (admin only)
 *     tags: [Admin]
 *     security: [{ ApiKeyAuth: [] }]
 *     responses:
 *       200: { description: Pending listings ordered by report count }
 *   delete:
 *     summary: Remove or approve a listing (admin only)
 *     tags: [Admin]
 *     security: [{ ApiKeyAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [listingId, status]
 *             properties:
 *               listingId: { type: string }
 *               status: { type: string, enum: [approved, removed] }
 *     responses:
 *       200: { description: Updated listing }
 */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) {
    return createErrorResponse(guard.error === 'Missing API key' ? 401 : 403, guard.error ?? 'Unauthorized');
  }
  const queue = store.listModerationQueue().sort((a, b) => b.reportCount - a.reportCount);
  return createSuccessResponse(queue, { apiVersion: 'v1' });
}

export async function DELETE(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) {
    return createErrorResponse(403, guard.error ?? 'Forbidden');
  }

  let body: { listingId?: string; status?: 'approved' | 'removed' };
  try {
    body = await request.json();
  } catch {
    return createErrorResponse(400, 'Invalid JSON body');
  }

  if (!body.listingId || (body.status !== 'approved' && body.status !== 'removed')) {
    return createErrorResponse(400, 'Fields "listingId" and "status" (approved|removed) are required');
  }

  const updated = store.setListingStatus(body.listingId, body.status, guard.actor!);
  if (!updated) {
    return createErrorResponse(404, 'Listing not found or already in requested state');
  }
  return createSuccessResponse(updated, { apiVersion: 'v1' });
}
