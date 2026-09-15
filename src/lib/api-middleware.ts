import { NextRequest, NextResponse } from 'next/server';
import { getAuthModule } from '@/lib/auth-instance';
import type { AuthContext, Role } from '@/lib/auth';

export interface ApiAuthResult {
  valid: boolean;
  clientId?: string;
  roles?: Role[];
  authContext?: AuthContext;
  error?: string;
}

/**
 * Documented bootstrap key (README / Swagger UI). Intended for local
 * development and demos only; override via API_DEMO_KEY.
 */
const DEMO_API_KEY = process.env.API_DEMO_KEY ?? 'sk_test_12345';

/**
 * Validate the request's `x-api-key` against the AuthModule.
 *
 * Two paths:
 *  - the documented bootstrap/demo key, mapped to an admin client, and
 *  - real keys issued by `AuthModule.createApiKey` (hashed, revocable,
 *    expirable), whose roles drive the permission checks below.
 */
export async function validateApiKey(request: NextRequest): Promise<ApiAuthResult> {
  const apiKey = request.headers.get('x-api-key');

  if (!apiKey) {
    return { valid: false, error: 'Missing API key' };
  }

  const auth = getAuthModule();

  if (apiKey === DEMO_API_KEY) {
    return {
      valid: true,
      clientId: 'client_demo',
      roles: ['admin'],
    };
  }

  const context = await auth.validateApiKey(apiKey);
  if (!context) {
    return { valid: false, error: 'Invalid, expired, or revoked API key' };
  }

  return {
    valid: true,
    clientId: `client_${context.apiKeyId}`,
    roles: context.roles,
    authContext: context,
  };
}

/**
 * Role-based permission gate for route handlers. Resource/action names follow
 * the ROLE_PERMISSIONS matrix in lib/auth.ts.
 */
export function hasPermission(result: ApiAuthResult, resource: string, action: string): boolean {
  if (!result.valid || !result.roles) {
    return false;
  }
  return getAuthModule().hasPermission(result.roles, resource, action);
}

// Admin RBAC guard. Unlike the placeholder above, this actually validates the
// key against the AuthModule and requires the `admin` role before any admin
// route handler runs. Exported for direct use in /api/v1/admin/* routes.
export async function requireAdmin(request: NextRequest): Promise<{
  ok: boolean;
  actor?: string;
  error?: string;
}> {
  const authModule = getAuthModule();
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) {
    return { ok: false, error: 'Missing API key' };
  }

  const context = await authModule.validateApiKey(apiKey);
  if (!context) {
    return { ok: false, error: 'Invalid or revoked API key' };
  }

  if (!authModule.hasPermission(context.roles, 'admin', '*')) {
    return { ok: false, error: 'Forbidden: admin role required' };
  }

  // The key id doubles as the audit actor for moderation actions.
  return { ok: true, actor: context.apiKeyId };
}

// Standard error response format
export function createErrorResponse(status: number, message: string, details?: unknown) {
  return NextResponse.json(
    {
      error: {
        status,
        message,
        details,
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}

// Success response formatter
export function createSuccessResponse(data: unknown, metadata?: Record<string, unknown>) {
  return NextResponse.json({
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  });
}