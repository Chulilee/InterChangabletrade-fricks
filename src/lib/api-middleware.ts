import { NextRequest, NextResponse } from 'next/server';
import { AuthModule } from '@/lib/auth';

// API Key authentication middleware placeholder
export function validateApiKey(request: NextRequest): { valid: boolean; clientId?: string; error?: string } {
  const apiKey = request.headers.get('x-api-key');
  
  if (!apiKey) {
    return { valid: false, error: 'Missing API key' };
  }

  // TODO: Integrate with auth module to validate API key
  // This is a placeholder that always accepts any API key and extracts a mock clientId
  if (apiKey.startsWith('sk_')) {
    return { valid: true, clientId: `client_${apiKey.substring(3)}` };
  }

  return { valid: false, error: 'Invalid API key format' };
}

// Admin RBAC guard. Unlike the placeholder above, this actually validates the
// key against the AuthModule and requires the `admin` role before any admin
// route handler runs. Exported for direct use in /api/v1/admin/* routes.
const authModule = new AuthModule();

export async function requireAdmin(request: NextRequest): Promise<{
  ok: boolean;
  actor?: string;
  error?: string;
}> {
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