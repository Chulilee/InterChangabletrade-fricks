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
export function createSuccessResponse(data: unknown, metadata?: Record<string, unknown>, status?: number) {
  return NextResponse.json({
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  }, { status });
}

/**
 * Market data cache TTL in seconds (configurable via env).
 */
export const MARKET_DATA_CACHE_TTL = (() => {
  const parsed = Number(process.env.MARKET_DATA_CACHE_TTL);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 5;
})();

/**
 * Cache-Control header value for market data endpoints.
 */
export function marketDataCacheControl(ttlSeconds: number = MARKET_DATA_CACHE_TTL): string {
  const normalized = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? Math.floor(ttlSeconds) : 5;
  return `private, max-age=${normalized}, stale-while-revalidate=${normalized}`;
}

/**
 * Strong ETag generator (djb2 hash of the serialized payload).
 */
export function computeETag(payload: unknown): string {
  const serialized = JSON.stringify(payload);
  let hash = 5381;
  for (let i = 0; i < serialized.length; i++) {
    hash = ((hash << 5) + hash + serialized.charCodeAt(i)) >>> 0;
  }
  return `"${hash.toString(36)}"`;
}

/**
 * Apply Cache-Control / ETag headers to a successful market data
 * response. Returns a 304 Not Modified response when the client's
 * If-None-Match matches the current ETag, otherwise the original
 * response with cache headers attached.
 */
export function withMarketDataCacheHeaders(
  response: NextResponse,
  etag: string,
  request?: NextRequest,
  ttlSeconds: number = MARKET_DATA_CACHE_TTL,
): NextResponse {
  const cacheControl = marketDataCacheControl(ttlSeconds);

  if (request) {
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch.split(',').map((v) => v.trim()).includes(etag)) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          'Cache-Control': cacheControl,
          ETag: etag,
          Vary: 'Authorization',
        },
      });
    }
  }

  response.headers.set('Cache-Control', cacheControl);
  response.headers.set('ETag', etag);
  // Market data varies by API key, so shared caches must not reuse it.
  response.headers.set('Vary', 'Authorization');
  return response;
}