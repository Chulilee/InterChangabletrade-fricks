import { AuthModule } from './auth';

// Singleton instance of the AuthModule so issued API keys survive across
// route-handler invocations, mirroring lib/trading-instance.ts.
let authModule: AuthModule | null = null;

export function getAuthModule(): AuthModule {
  if (!authModule) {
    authModule = new AuthModule();
  }
  return authModule;
}

// Reset the singleton. Used by tests to isolate key state between cases;
// not used by the running application.
export function resetAuthModule(): void {
  authModule = null;
}
