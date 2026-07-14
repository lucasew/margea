import {
  EFFECTIVE_MODE_STORAGE_KEY,
  API_ROUTES,
  APP_ROUTES,
} from '../constants';
import { reportError } from '../utils/errorReporting';

/**
 * Represents the authentication data retrieved from the server.
 */
export interface AuthData {
  /** The GitHub access token (OAuth or PAT). */
  token: string;
  /**
   * Login-time label only (which OAuth button / PAT path was used).
   * Not used for write gates — see getTokenCapability().
   */
  loginMode?: 'read' | 'write';
}

/** Scopes that let Margea perform write mutations (merge/close PRs). */
const WRITE_SCOPES = new Set(['repo', 'public_repo']);

type TokenCapability = 'read' | 'write';

let capabilityCache: {
  token: string;
  capability: TokenCapability;
  scopes: string[];
} | null = null;

/**
 * In-memory session token from /api/auth/token.
 * undefined = cold; null = known unauthenticated; AuthData = logged in.
 * Adaptive multi-scope GraphQL would otherwise re-hit the session endpoint
 * on every page.
 */
let sessionAuthCache: AuthData | null | undefined = undefined;
/** Bumped on invalidate so in-flight fetches do not repopulate a cleared cache. */
let sessionAuthEpoch = 0;
/** Single-flight: parallel getAuthData/getToken share one session request. */
let sessionAuthInFlight: Promise<AuthData | null> | null = null;

function readStoredEffectiveMode(): 'read' | 'write' | null {
  try {
    const stored = localStorage.getItem(EFFECTIVE_MODE_STORAGE_KEY);
    if (stored === 'read' || stored === 'write') return stored;
  } catch {
    // ignore storage errors
  }
  return null;
}

function parseScopeHeader(header: string | null): string[] {
  if (!header || !header.trim()) return [];
  return header
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Map GitHub OAuth scope list → capability.
 * Classic OAuth / classic PAT expose scopes via X-OAuth-Scopes.
 */
export function capabilityFromScopes(scopes: string[]): TokenCapability {
  for (const scope of scopes) {
    if (WRITE_SCOPES.has(scope)) return 'write';
  }
  return 'read';
}

/**
 * Ingest scopes from any GitHub API response (REST or GraphQL).
 * Call when you have X-OAuth-Scopes so capability stays in sync.
 */
export function noteTokenScopesFromHeaders(
  token: string,
  headers: Headers,
): TokenCapability | null {
  const raw = headers.get('X-OAuth-Scopes');
  if (raw === null) {
    // Fine-grained PAT or response without classic scopes: don't update cache from absence alone
    return capabilityCache?.token === token ? capabilityCache.capability : null;
  }
  const scopes = parseScopeHeader(raw);
  const capability = capabilityFromScopes(scopes);
  capabilityCache = { token, capability, scopes };
  return capability;
}

/**
 * Drop session token + capability caches (logout, 401, re-auth).
 * Exported for tests; production callers use AuthService.logout().
 */
export function invalidateAuthSessionCache(): void {
  sessionAuthEpoch += 1;
  sessionAuthCache = undefined;
  sessionAuthInFlight = null;
  capabilityCache = null;
}

async function loadAuthDataFromServer(): Promise<AuthData | null> {
  const response = await fetch(API_ROUTES.AUTH_TOKEN, {
    credentials: 'include',
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    token?: string;
    mode?: string;
  };
  if (!data.token) {
    return null;
  }

  return {
    token: data.token,
    loginMode: data.mode === 'write' ? 'write' : 'read',
  };
}

/**
 * Service to manage authentication state on the client side.
 *
 * Login read/write only steers OAuth authorize scopes. Actual write capability
 * is always derived from the live token (X-OAuth-Scopes), not session JWT mode.
 * Effective UI mode is a soft localStorage flag clamped by that capability.
 *
 * Session token is cached in memory and single-flighted: multi-scope PR
 * fetches reuse one /api/auth/token round-trip until logout or 401.
 */
export const AuthService = {
  async getAuthData(): Promise<AuthData | null> {
    if (sessionAuthCache !== undefined) {
      return sessionAuthCache;
    }

    if (sessionAuthInFlight) {
      return sessionAuthInFlight;
    }

    const epochAtStart = sessionAuthEpoch;

    sessionAuthInFlight = (async () => {
      try {
        const data = await loadAuthDataFromServer();
        if (epochAtStart === sessionAuthEpoch) {
          sessionAuthCache = data;
        }
        return data;
      } catch (error) {
        reportError(error, { context: 'fetching auth data' });
        // Transient network errors: do not cache null (retry next call).
        return null;
      } finally {
        if (epochAtStart === sessionAuthEpoch) {
          sessionAuthInFlight = null;
        }
      }
    })();

    return sessionAuthInFlight;
  },

  async getToken(): Promise<string | null> {
    const authData = await this.getAuthData();
    return authData?.token || null;
  },

  /**
   * Probe GitHub with the token and read X-OAuth-Scopes.
   * Cached per token until logout / token change.
   */
  async probeTokenCapability(token: string): Promise<TokenCapability> {
    if (capabilityCache?.token === token) {
      return capabilityCache.capability;
    }

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });

      if (response.status === 401) {
        invalidateAuthSessionCache();
        return 'read';
      }

      const fromHeaders = noteTokenScopesFromHeaders(token, response.headers);
      if (fromHeaders) {
        return fromHeaders;
      }

      // No classic scope header (common for fine-grained github_pat_*).
      // We cannot enumerate permissions here; treat as read so we never
      // falsely enable write without evidence. User can still use PAT that
      // returns X-OAuth-Scopes (classic) or OAuth with repo scope.
      const scopes = parseScopeHeader(response.headers.get('X-OAuth-Scopes'));
      const capability = capabilityFromScopes(scopes);
      capabilityCache = { token, capability, scopes };
      return capability;
    } catch (error) {
      reportError(error, { context: 'probing token capability' });
      // Fail closed: read-only until we know better
      return capabilityCache?.token === token
        ? capabilityCache.capability
        : 'read';
    }
  },

  /** Live capability from token scopes (not login button / session mode). */
  async getTokenCapability(): Promise<TokenCapability | null> {
    const token = await this.getToken();
    if (!token) return null;
    return this.probeTokenCapability(token);
  },

  /** Last known scopes from probe/headers (debug / future UI). */
  getCachedScopes(): string[] {
    return capabilityCache?.scopes ?? [];
  },

  /**
   * Effective access mode used by the UI and write gates.
   * Preference in localStorage, clamped by live token capability.
   */
  async getPermissions(): Promise<'read' | 'write' | null> {
    const capability = await this.getTokenCapability();
    if (!capability) return null;

    if (capability === 'read') {
      const preferred = readStoredEffectiveMode();
      if (preferred === 'write') {
        this.persistEffectiveMode('read');
      }
      return 'read';
    }

    const preferred = readStoredEffectiveMode();
    if (preferred === 'write') return 'write';
    if (preferred === 'read') return 'read';
    return capability;
  },

  persistEffectiveMode(mode: 'read' | 'write'): void {
    try {
      localStorage.setItem(EFFECTIVE_MODE_STORAGE_KEY, mode);
    } catch (error) {
      reportError(error, { context: 'saving effective mode preference' });
    }
    window.dispatchEvent(
      new CustomEvent('margea-effective-mode', { detail: { mode } }),
    );
  },

  async setEffectiveMode(
    mode: 'read' | 'write',
  ): Promise<{ ok: boolean; mode: 'read' | 'write' | null }> {
    const capability = await this.getTokenCapability();
    if (!capability) return { ok: false, mode: null };

    if (mode === 'write' && capability !== 'write') {
      this.persistEffectiveMode('read');
      return { ok: false, mode: 'read' };
    }

    this.persistEffectiveMode(mode);
    return { ok: true, mode };
  },

  async toggleEffectiveMode(): Promise<'read' | 'write' | null> {
    const capability = await this.getTokenCapability();
    if (!capability) return null;

    if (capability === 'read') {
      this.persistEffectiveMode('read');
      return 'read';
    }

    const current = await this.getPermissions();
    if (!current) return null;

    const next = current === 'write' ? 'read' : 'write';
    const result = await this.setEffectiveMode(next);
    return result.mode;
  },

  async hasWritePermission(): Promise<boolean> {
    const mode = await this.getPermissions();
    return mode === 'write';
  },

  async clearSession(): Promise<void> {
    try {
      await fetch(API_ROUTES.AUTH_LOGOUT, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      reportError(error, { context: 'clearing session' });
    } finally {
      invalidateAuthSessionCache();
    }
  },

  async logout(): Promise<void> {
    await this.clearSession();
    window.location.href = APP_ROUTES.HOME;
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  },
};
