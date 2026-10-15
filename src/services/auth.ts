import {
  EFFECTIVE_MODE_STORAGE_KEY,
  API_ROUTES,
  APP_ROUTES,
} from '../constants';
import type { AccessMode } from '../types';
import { reportError } from '../utils/errorReporting';

export interface AuthData {
  token: string;
  /**
   * Login-time label only (which OAuth button / PAT path was used).
   * Not used for write gates — see getTokenCapability().
   */
  loginMode?: AccessMode;
}

/** Scopes that let Margea perform write mutations (merge/close PRs). */
const WRITE_SCOPES = new Set(['repo', 'public_repo']);

let capabilityCache: {
  token: string;
  capability: AccessMode;
  scopes: string[];
} | null = null;

/**
 * In-memory session token from /api/auth/token.
 * undefined = cold; null = known unauthenticated; AuthData = logged in.
 */
let sessionAuthCache: AuthData | null | undefined = undefined;
/** Bumped on invalidate so in-flight fetches do not repopulate a cleared cache. */
let sessionAuthEpoch = 0;
let sessionAuthInFlight: Promise<AuthData | null> | null = null;

function readStoredEffectiveMode(): AccessMode | null {
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
export function capabilityFromScopes(scopes: string[]): AccessMode {
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
): AccessMode | null {
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
  async probeTokenCapability(token: string): Promise<AccessMode> {
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

      // No classic scope header (common for fine-grained github_pat_*): fail closed to read.
      capabilityCache = { token, capability: 'read', scopes: [] };
      return 'read';
    } catch (error) {
      reportError(error, { context: 'probing token capability' });
      return capabilityCache?.token === token
        ? capabilityCache.capability
        : 'read';
    }
  },

  async getTokenCapability(): Promise<AccessMode | null> {
    const token = await this.getToken();
    if (!token) return null;
    return this.probeTokenCapability(token);
  },

  /**
   * Effective access mode used by the UI and write gates.
   * Preference in localStorage, clamped by live token capability.
   */
  async getPermissions(): Promise<AccessMode | null> {
    const capability = await this.getTokenCapability();
    if (!capability) return null;

    const preferred = readStoredEffectiveMode();
    if (capability === 'read') {
      if (preferred === 'write') {
        this.persistEffectiveMode('read');
      }
      return 'read';
    }

    return preferred ?? capability;
  },

  persistEffectiveMode(mode: AccessMode): void {
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
    mode: AccessMode,
  ): Promise<{ ok: boolean; mode: AccessMode | null }> {
    const capability = await this.getTokenCapability();
    if (!capability) return { ok: false, mode: null };

    if (mode === 'write' && capability !== 'write') {
      this.persistEffectiveMode('read');
      return { ok: false, mode: 'read' };
    }

    this.persistEffectiveMode(mode);
    return { ok: true, mode };
  },

  async toggleEffectiveMode(): Promise<AccessMode | null> {
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

  /**
   * Drop session cookie + in-memory caches without navigating.
   * Used by logout and re-auth entry points that share the same cleanup.
   */
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
