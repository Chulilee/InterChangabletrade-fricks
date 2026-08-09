import { NextRequest, NextResponse } from 'next/server';

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