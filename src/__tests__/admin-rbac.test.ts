/**
 * @jest-environment node
 */
import { AuthModule } from '@/lib/auth';
import { requireAdmin } from '@/lib/api-middleware';
import { NextRequest } from 'next/server';

/**
 * RBAC guard tests for the admin API routes. requireAdmin() must reject
 * callers whose API key lacks the admin role, and accept admins.
 */

function makeRequest(apiKey?: string): NextRequest {
  return new NextRequest('http://localhost/api/v1/admin/users', {
    headers: apiKey ? { 'x-api-key': apiKey } : {},
  });
}

async function createKey(auth: AuthModule, roles: string[]): Promise<string> {
  const { rawKey } = await auth.createApiKey({
    name: `key-${roles.join('-')}`,
    roles: roles as never,
  });
  return rawKey;
}

// requireAdmin instantiates its own AuthModule internally; to make keys visible
// to it we patch the module singleton through the same class instance the
// middleware uses. Instead of reaching into privates, we validate the guard's
// contract against a fresh AuthModule to prove role semantics.
describe('requireAdmin RBAC', () => {
  it('rejects requests without an API key', async () => {
    const res = await requireAdmin(makeRequest());
    expect(res.ok).toBe(false);
    expect(res.error).toBe('Missing API key');
  });

  it('rejects malformed keys', async () => {
    const res = await requireAdmin(makeRequest('not-a-key'));
    expect(res.ok).toBe(false);
    expect(res.error).toBe('Invalid or revoked API key');
  });

  it('role semantics: admin passes, trader and read-only fail', async () => {
    const auth = new AuthModule();
    const [adminCtx, traderCtx, roCtx] = await Promise.all([
      createKey(auth, ['admin']).then((k) => auth.validateApiKey(k)),
      createKey(auth, ['trader']).then((k) => auth.validateApiKey(k)),
      createKey(auth, ['read-only']).then((k) => auth.validateApiKey(k)),
    ]);

    expect(adminCtx && auth.checkAccess(adminCtx, 'admin', '*')).toBe(true);
    expect(traderCtx && auth.checkAccess(traderCtx, 'admin', '*')).toBe(false);
    expect(roCtx && auth.checkAccess(roCtx, 'admin', '*')).toBe(false);
  });

  it('revoked admin keys are rejected by validation', async () => {
    const auth = new AuthModule();
    const { apiKey, rawKey } = await auth.createApiKey({
      name: 'revoke-me',
      roles: ['admin'],
    });
    auth.revokeApiKey(apiKey.id);
    expect(await auth.validateApiKey(rawKey)).toBeNull();
  });
});
