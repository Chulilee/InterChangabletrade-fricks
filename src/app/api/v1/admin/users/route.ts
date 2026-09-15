import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createErrorResponse, createSuccessResponse } from '@/lib/api-middleware';
import { AdminStore } from '@/lib/admin-store';

const store = new AdminStore();

/**
 * @openapi
 * /api/v1/admin/users:
 *   get:
 *     summary: List platform users (admin only)
 *     tags: [Admin]
 *     security: [{ ApiKeyAuth: [] }]
 *     responses:
 *       200: { description: User list with ban status }
 *   patch:
 *     summary: Ban or unban a user (admin only)
 *     tags: [Admin]
 *     security: [{ ApiKeyAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [address, banned]
 *             properties:
 *               address: { type: string }
 *               banned: { type: boolean }
 *               reason: { type: string }
 *     responses:
 *       200: { description: Updated user }
 *       403: { description: Caller lacks the admin role }
 */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) {
    return createErrorResponse(guard.error === 'Missing API key' ? 401 : 403, guard.error ?? 'Unauthorized');
  }
  return createSuccessResponse(store.listUsers(), { apiVersion: 'v1' });
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) {
    return createErrorResponse(403, guard.error ?? 'Forbidden');
  }

  let body: { address?: string; banned?: boolean; reason?: string };
  try {
    body = await request.json();
  } catch {
    return createErrorResponse(400, 'Invalid JSON body');
  }

  if (!body.address || typeof body.banned !== 'boolean') {
    return createErrorResponse(400, 'Fields "address" and "banned" are required');
  }

  const updated = store.setUserBanned(body.address, body.banned, guard.actor!, body.reason);
  if (!updated) {
    return createErrorResponse(404, 'User not found or already in requested state');
  }
  return createSuccessResponse(updated, { apiVersion: 'v1' });
}

export async function DELETE() {
  return NextResponse.json(
    { error: { status: 405, message: 'Method not allowed', timestamp: new Date().toISOString() } },
    { status: 405 },
  );
}
