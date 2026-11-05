import { NextResponse } from 'next/server';
import { createErrorResponse } from './api-middleware';

/**
 * API-level rate limiting.
 *
 * The trading engine enforces rate limits once an order reaches it, but the
 * API layer itself accepted unlimited requests before that point. This module
 * applies a fixed-window limiter in front of mutating route handlers so abusive
 * or buggy clients are rejected with `429 Too Many Requests` (and a
 * `Retry-After` header) before any work is done.
 *
 * The pattern mirrors the engine's own `RateLimitTier`/`RateLimitConfig`:
 * a `windowMs`/`maxRequests` pair per tier, sensible defaults, programmatic
 * reconfiguration and periodic sweeping of expired entries so the maps do not
 * grow without bound.
 */

export interface ApiRateLimitTier {
  windowMs: number;
  maxRequests: number;
}

export interface ApiRateLimitConfig {
  /** Applied to any endpoint without an explicit override. */
  default: ApiRateLimitTier;
  /** Per-endpoint overrides, keyed by endpoint id (see `ApiRateLimitEndpoint`). */
  endpoints: Record<string, ApiRateLimitTier>;
}

/**
 * Stable endpoint ids used for per-endpoint configuration. Keeping them as
 * string constants avoids route paths leaking into the limiter and lets each
 * mutating handler opt in with a single call.
 */
export const API_RATE_LIMIT_ENDPOINTS = [
  'orders:create',
  'orders:batch',
  'orders:cancel',
  'payments:create',
  'payments:webhook',
  'analytics:events',
  'admin:disputes',
  'admin:listings',
  'admin:users',
] as const;

export type ApiRateLimitEndpoint = (typeof API_RATE_LIMIT_ENDPOINTS)[number];

/**
 * Default limits per endpoint. Orders and payments are tighter because they
 * move value; analytics is looser because browsers emit events on every page
 * view; admin mutations are moderate. `default` covers anything not listed.
 */
const DEFAULT_API_RATE_LIMIT_CONFIG: ApiRateLimitConfig = {
  default: { windowMs: 60_000, maxRequests: 60 },
  endpoints: {
    'orders:create': { windowMs: 60_000, maxRequests: 30 },
    'orders:batch': { windowMs: 60_000, maxRequests: 10 },
    'orders:cancel': { windowMs: 60_000, maxRequests: 30 },
    'payments:create': { windowMs: 60_000, maxRequests: 20 },
    'payments:webhook': { windowMs: 60_000, maxRequests: 120 },
    'analytics:events': { windowMs: 60_000, maxRequests: 120 },
    'admin:disputes': { windowMs: 60_000, maxRequests: 30 },
    'admin:listings': { windowMs: 60_000, maxRequests: 30 },
    'admin:users': { windowMs: 60_000, maxRequests: 30 },
  },
};

function readEnvTier(envValue: string | undefined): ApiRateLimitTier | null {
  if (!envValue) return null;
  const match = envValue.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) return null;
  const maxRequests = Number(match[1]);
  const windowMs = Number(match[2]);
  if (!Number.isFinite(maxRequests) || !Number.isFinite(windowMs) || maxRequests <= 0 || windowMs <= 0) {
    return null;
  }
  return { maxRequests, windowMs };
}

/**
 * Build the effective configuration, allowing environment variables to
 * override the defaults without a code change:
 *   API_RATE_LIMIT_DEFAULT="<maxRequests>/<windowMs>"
 *   API_RATE_LIMIT_ORDERS_CREATE="<maxRequests>/<windowMs>", etc.
 * (endpoint id upper-cased with ':' replaced by '_').
 */
function buildConfigFromEnv(): ApiRateLimitConfig {
  const endpoints: Record<string, ApiRateLimitTier> = { ...DEFAULT_API_RATE_LIMIT_CONFIG.endpoints };
  for (const endpoint of API_RATE_LIMIT_ENDPOINTS) {
    const envKey = `API_RATE_LIMIT_${endpoint.toUpperCase().replace(/:/g, '_')}`;
    const tier = readEnvTier(process.env[envKey]);
    if (tier) {
      endpoints[endpoint] = tier;
    }
  }
  return {
    default: readEnvTier(process.env.API_RATE_LIMIT_DEFAULT) ?? { ...DEFAULT_API_RATE_LIMIT_CONFIG.default },
    endpoints,
  };
}

let config: ApiRateLimitConfig = buildConfigFromEnv();

/** Replace the active configuration (merged over the defaults). */
export function setApiRateLimitConfig(next: Partial<ApiRateLimitConfig>): ApiRateLimitConfig {
  config = {
    default: next.default ? { ...next.default } : { ...config.default },
    endpoints: { ...config.endpoints, ...(next.endpoints ?? {}) },
  };
  return getApiRateLimitConfig();
}

/** Restore the built-in (plus environment) configuration. */
export function resetApiRateLimitConfig(): ApiRateLimitConfig {
  config = buildConfigFromEnv();
  return getApiRateLimitConfig();
}

/** Effective configuration for one endpoint. */
export function getApiRateLimitTier(endpoint: string): ApiRateLimitTier {
  const tier = config.endpoints[endpoint] ?? config.default;
  return { ...tier };
}

export function getApiRateLimitConfig(): ApiRateLimitConfig {
  return {
    default: { ...config.default },
    endpoints: Object.fromEntries(
      Object.entries(config.endpoints).map(([key, tier]) => [key, { ...tier }]),
    ),
  };
}

interface RateLimitBucket {
  count: number;
  resetTime: number;
}

// Keyed by `${endpoint}:${clientKey}` so each endpoint gets an independent window.
const buckets = new Map<string, RateLimitBucket>();

// Periodic sweep of expired buckets. Unref'd so it never keeps a process alive.
let cleanupTimer: ReturnType<typeof setInterval> | null = null;
if (typeof setInterval === 'function') {
  cleanupTimer = setInterval(() => cleanupExpiredApiRateLimitEntries(), 60_000);
  cleanupTimer.unref?.();
}

/** Remove buckets whose window has closed. */
export function cleanupExpiredApiRateLimitEntries(now: number = Date.now()): void {
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetTime) {
      buckets.delete(key);
    }
  }
}

/** Drop all tracked buckets. Intended for tests. */
export function resetApiRateLimits(): void {
  buckets.clear();
}

export interface ApiRateLimitResult {
  allowed: boolean;
  endpoint: string;
  clientKey: string;
  limit: number;
  remaining: number;
  /** Epoch milliseconds at which the current window resets. */
  resetTime: number;
  /** Seconds the client should wait before retrying (only meaningful when blocked). */
  retryAfterSeconds: number;
}

/**
 * Consume one request from the fixed window for `endpoint`/`clientKey`.
 */
export function checkApiRateLimit(
  endpoint: string,
  clientKey: string,
  now: number = Date.now(),
): ApiRateLimitResult {
  const tier = getApiRateLimitTier(endpoint);
  const key = `${endpoint}:${clientKey}`;
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetTime) {
    const resetTime = now + tier.windowMs;
    buckets.set(key, { count: 1, resetTime });
    return {
      allowed: true,
      endpoint,
      clientKey,
      limit: tier.maxRequests,
      remaining: tier.maxRequests - 1,
      resetTime,
      retryAfterSeconds: 0,
    };
  }

  if (bucket.count >= tier.maxRequests) {
    return {
      allowed: false,
      endpoint,
      clientKey,
      limit: tier.maxRequests,
      remaining: 0,
      resetTime: bucket.resetTime,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetTime - now) / 1000)),
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    endpoint,
    clientKey,
    limit: tier.maxRequests,
    remaining: tier.maxRequests - bucket.count,
    resetTime: bucket.resetTime,
    retryAfterSeconds: 0,
  };
}

/** Minimal request shape — accepts both NextRequest and the web-standard Request. */
export interface RateLimitRequest {
  headers: Headers;
}

/**
 * Identify the caller for rate limiting. An authenticated client id wins;
 * otherwise fall back to the forwarded/real IP; otherwise a shared
 * 'anonymous' bucket.
 */
export function resolveClientKey(request: RateLimitRequest, clientId?: string): string {
  if (clientId) {
    return `client:${clientId}`;
  }
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip')?.trim();
  return ip ? `ip:${ip}` : 'anonymous';
}

/** Build the standard 429 response, including the `Retry-After` header. */
export function rateLimitExceededResponse(result: ApiRateLimitResult): NextResponse {
  const response = createErrorResponse(429, 'Rate limit exceeded', {
    endpoint: result.endpoint,
    limit: result.limit,
    retryAfterSeconds: result.retryAfterSeconds,
  });
  response.headers.set('Retry-After', String(result.retryAfterSeconds));
  response.headers.set('X-RateLimit-Limit', String(result.limit));
  response.headers.set('X-RateLimit-Remaining', '0');
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)));
  return response;
}

/**
 * Enforce the rate limit for a mutating endpoint. Returns `null` when the
 * request may proceed, otherwise a ready-to-return 429 response.
 */
export function enforceApiRateLimit(
  request: RateLimitRequest,
  endpoint: ApiRateLimitEndpoint | string,
  clientId?: string,
): NextResponse | null {
  const result = checkApiRateLimit(endpoint, resolveClientKey(request, clientId));
  if (result.allowed) {
    return null;
  }
  return rateLimitExceededResponse(result);
}
