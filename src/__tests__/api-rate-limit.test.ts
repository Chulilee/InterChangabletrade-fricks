import {
  checkApiRateLimit,
  enforceApiRateLimit,
  getApiRateLimitTier,
  rateLimitExceededResponse,
  resetApiRateLimitConfig,
  resetApiRateLimits,
  resolveClientKey,
  setApiRateLimitConfig,
} from '@/lib/api-rate-limit';

describe('API rate limiting', () => {
  beforeEach(() => {
    resetApiRateLimitConfig();
    resetApiRateLimits();
  });

  it('allows requests up to the configured limit, then blocks with a retry-after', () => {
    setApiRateLimitConfig({
      endpoints: { 'orders:create': { windowMs: 60_000, maxRequests: 2 } },
    });

    expect(checkApiRateLimit('orders:create', 'client:one').allowed).toBe(true);
    expect(checkApiRateLimit('orders:create', 'client:one').allowed).toBe(true);

    const blocked = checkApiRateLimit('orders:create', 'client:one');
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('tracks buckets independently per endpoint and per client', () => {
    setApiRateLimitConfig({
      endpoints: { 'orders:create': { windowMs: 60_000, maxRequests: 1 } },
    });

    expect(checkApiRateLimit('orders:create', 'client:a').allowed).toBe(true);
    // Same client, different endpoint: unaffected.
    expect(checkApiRateLimit('orders:batch', 'client:a').allowed).toBe(true);
    // Same endpoint, different client: unaffected.
    expect(checkApiRateLimit('orders:create', 'client:b').allowed).toBe(true);
    // Same client and endpoint: over the limit.
    expect(checkApiRateLimit('orders:create', 'client:a').allowed).toBe(false);
  });

  it('exposes per-endpoint defaults and honours overrides', () => {
    expect(getApiRateLimitTier('orders:batch').maxRequests).toBe(10);
    expect(getApiRateLimitTier('some-unlisted-endpoint').maxRequests).toBe(60);

    setApiRateLimitConfig({
      endpoints: { 'orders:batch': { windowMs: 30_000, maxRequests: 3 } },
    });
    expect(getApiRateLimitTier('orders:batch')).toEqual({ windowMs: 30_000, maxRequests: 3 });
  });

  it('prefers the authenticated client id to the forwarded IP', () => {
    const request = { headers: new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }) };
    expect(resolveClientKey(request, 'client_42')).toBe('client:client_42');
    expect(resolveClientKey(request)).toBe('ip:203.0.113.7');
    expect(resolveClientKey({ headers: new Headers() })).toBe('anonymous');
  });

  it('returns null while under the limit and a 429 with Retry-After once over it', () => {
    setApiRateLimitConfig({
      endpoints: { 'payments:create': { windowMs: 60_000, maxRequests: 1 } },
    });
    const request = { headers: new Headers({ 'x-forwarded-for': '203.0.113.9' }) };

    expect(enforceApiRateLimit(request, 'payments:create')).toBeNull();

    const limited = enforceApiRateLimit(request, 'payments:create');
    expect(limited).not.toBeNull();
    expect(limited!.status).toBe(429);
    expect(limited!.headers.get('Retry-After')).toBeTruthy();
    expect(limited!.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('builds a 429 response with the retry-after header', () => {
    setApiRateLimitConfig({
      endpoints: { 'analytics:events': { windowMs: 60_000, maxRequests: 1 } },
    });
    checkApiRateLimit('analytics:events', 'ip:203.0.113.44');
    const blocked = checkApiRateLimit('analytics:events', 'ip:203.0.113.44');

    const response = rateLimitExceededResponse(blocked);
    expect(response.status).toBe(429);
    expect(Number(response.headers.get('Retry-After'))).toBeGreaterThan(0);
  });
});
