/**
 * @jest-environment node
 */
import { AuthModule } from '@/lib/auth';

describe('AuthModule', () => {
  let auth: AuthModule;

  beforeEach(() => {
    auth = new AuthModule();
  });

  describe('createApiKey', () => {
    it('should create a new API key', async () => {
      const result = await auth.createApiKey({
        name: 'Test Key',
        roles: ['trader'],
      });

      expect(result.apiKey).toBeDefined();
      expect(result.rawKey).toMatch(/^sk_/);
      expect(result.apiKey.name).toBe('Test Key');
      expect(result.apiKey.roles).toEqual(['trader']);
      expect(result.apiKey.revoked).toBe(false);
    });

    it('should generate unique keys', async () => {
      const result1 = await auth.createApiKey({
        name: 'Key 1',
        roles: ['trader'],
      });
      const result2 = await auth.createApiKey({
        name: 'Key 2',
        roles: ['trader'],
      });

      expect(result1.rawKey).not.toBe(result2.rawKey);
    });
  });

  describe('validateApiKey', () => {
    it('should validate a valid API key', async () => {
      const { rawKey } = await auth.createApiKey({
        name: 'Test Key',
        roles: ['trader'],
      });

      const context = await auth.validateApiKey(rawKey);

      expect(context).not.toBeNull();
      expect(context?.roles).toEqual(['trader']);
    });

    it('should reject an invalid API key', async () => {
      const context = await auth.validateApiKey('sk_invalid_key');
      expect(context).toBeNull();
    });

    it('should reject a revoked API key', async () => {
      const { apiKey, rawKey } = await auth.createApiKey({
        name: 'Test Key',
        roles: ['trader'],
      });

      auth.revokeApiKey(apiKey.id);

      const context = await auth.validateApiKey(rawKey);
      expect(context).toBeNull();
    });

    it('should reject an expired API key', async () => {
      const { rawKey } = await auth.createApiKey({
        name: 'Test Key',
        roles: ['trader'],
        expiresInDays: -1,
      });

      const context = await auth.validateApiKey(rawKey);
      expect(context).toBeNull();
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke an API key', async () => {
      const { apiKey } = await auth.createApiKey({
        name: 'Test Key',
        roles: ['trader'],
      });

      const result = auth.revokeApiKey(apiKey.id);
      expect(result).toBe(true);

      const revokedKey = auth.getApiKey(apiKey.id);
      expect(revokedKey?.revoked).toBe(true);
    });

    it('should return false for non-existent key', () => {
      const result = auth.revokeApiKey('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('should grant admin all permissions', () => {
      expect(auth.hasPermission(['admin'], '*', '*')).toBe(true);
      expect(auth.hasPermission(['admin'], 'orders', 'create')).toBe(true);
    });

    it('should grant trader order permissions', () => {
      expect(auth.hasPermission(['trader'], 'orders', 'create')).toBe(true);
      expect(auth.hasPermission(['trader'], 'orders', 'read')).toBe(true);
      expect(auth.hasPermission(['trader'], 'orders', 'cancel')).toBe(true);
      expect(auth.hasPermission(['trader'], 'portfolio', 'read')).toBe(true);
    });

    it('should deny trader admin permissions', () => {
      expect(auth.hasPermission(['trader'], 'users', 'delete')).toBe(false);
    });

    it('should grant read-only read permissions', () => {
      expect(auth.hasPermission(['read-only'], 'portfolio', 'read')).toBe(true);
      expect(auth.hasPermission(['read-only'], 'trades', 'read')).toBe(true);
    });

    it('should deny read-only write permissions', () => {
      expect(auth.hasPermission(['read-only'], 'orders', 'create')).toBe(false);
    });
  });

  describe('checkAccess', () => {
    it('should check access with valid context', async () => {
      const { rawKey } = await auth.createApiKey({
        name: 'Test Key',
        roles: ['trader'],
      });

      const context = await auth.validateApiKey(rawKey);
      expect(context).not.toBeNull();

      expect(auth.checkAccess(context!, 'orders', 'create')).toBe(true);
      expect(auth.checkAccess(context!, 'users', 'delete')).toBe(false);
    });
  });

  describe('listApiKeys', () => {
    it('should list all API keys', async () => {
      await auth.createApiKey({ name: 'Key 1', roles: ['trader'] });
      await auth.createApiKey({ name: 'Key 2', roles: ['read-only'] });

      const keys = auth.listApiKeys();
      expect(keys).toHaveLength(2);
    });
  });
});
