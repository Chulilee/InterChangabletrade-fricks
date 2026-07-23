export type Role = 'admin' | 'trader' | 'read-only';

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  roles: Role[];
  createdAt: number;
  lastUsedAt?: number;
  expiresAt?: number;
  revoked: boolean;
}

export interface CreateApiKeyRequest {
  name: string;
  roles: Role[];
  expiresInDays?: number;
}

export interface CreateApiKeyResponse {
  apiKey: ApiKey;
  rawKey: string;
}

export interface AuthContext {
  apiKeyId: string;
  roles: Role[];
  timestamp: number;
}

export interface Permission {
  resource: string;
  action: string;
}

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    { resource: '*', action: '*' },
  ],
  trader: [
    { resource: 'orders', action: 'create' },
    { resource: 'orders', action: 'read' },
    { resource: 'orders', action: 'cancel' },
    { resource: 'portfolio', action: 'read' },
    { resource: 'trades', action: 'read' },
  ],
  'read-only': [
    { resource: 'portfolio', action: 'read' },
    { resource: 'trades', action: 'read' },
    { resource: 'orders', action: 'read' },
  ],
};

export class AuthModule {
  private apiKeys: Map<string, ApiKey> = new Map();
  private keyHashes: Map<string, string> = new Map();

  private generateId(): string {
    return `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRawKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'sk_';
    for (let i = 0; i < 48; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  private async hashKey(key: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async createApiKey(request: CreateApiKeyRequest): Promise<CreateApiKeyResponse> {
    const rawKey = this.generateRawKey();
    const keyHash = await this.hashKey(rawKey);

    const apiKey: ApiKey = {
      id: this.generateId(),
      name: request.name,
      keyPrefix: rawKey.substring(0, 7) + '...',
      roles: request.roles,
      createdAt: Date.now(),
      expiresAt: request.expiresInDays
        ? Date.now() + request.expiresInDays * 24 * 60 * 60 * 1000
        : undefined,
      revoked: false,
    };

    this.apiKeys.set(apiKey.id, apiKey);
    this.keyHashes.set(keyHash, apiKey.id);

    return { apiKey, rawKey };
  }

  async validateApiKey(rawKey: string): Promise<AuthContext | null> {
    const keyHash = await this.hashKey(rawKey);
    const apiKeyId = this.keyHashes.get(keyHash);

    if (!apiKeyId) {
      return null;
    }

    const apiKey = this.apiKeys.get(apiKeyId);
    if (!apiKey || apiKey.revoked) {
      return null;
    }

    if (apiKey.expiresAt && Date.now() > apiKey.expiresAt) {
      return null;
    }

    apiKey.lastUsedAt = Date.now();

    return {
      apiKeyId: apiKey.id,
      roles: apiKey.roles,
      timestamp: Date.now(),
    };
  }

  revokeApiKey(apiKeyId: string): boolean {
    const apiKey = this.apiKeys.get(apiKeyId);
    if (!apiKey) {
      return false;
    }

    apiKey.revoked = true;
    return true;
  }

  listApiKeys(): ApiKey[] {
    return Array.from(this.apiKeys.values());
  }

  getApiKey(apiKeyId: string): ApiKey | null {
    return this.apiKeys.get(apiKeyId) || null;
  }

  hasPermission(roles: Role[], resource: string, action: string): boolean {
    return roles.some(role => {
      const permissions = ROLE_PERMISSIONS[role];
      return permissions.some(
        p =>
          (p.resource === '*' || p.resource === resource) &&
          (p.action === '*' || p.action === action),
      );
    });
  }

  checkAccess(context: AuthContext, resource: string, action: string): boolean {
    return this.hasPermission(context.roles, resource, action);
  }

  getRolePermissions(role: Role): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }
}
