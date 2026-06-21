import { EFFECTIVE_MODE_STORAGE_KEY } from '../constants';

/**
 * Represents the authentication data retrieved from the server.
 */
export interface AuthData {
  /** The GitHub OAuth access token. */
  token: string;
  /**
   * Capability encoded in the session JWT at login time (OAuth scope / PAT).
   * This does not change without re-authentication.
   */
  mode: 'read' | 'write';
}

function readStoredEffectiveMode(): 'read' | 'write' | null {
  try {
    const stored = localStorage.getItem(EFFECTIVE_MODE_STORAGE_KEY);
    if (stored === 'read' || stored === 'write') return stored;
  } catch {
    // ignore storage errors
  }
  return null;
}

/**
 * Service to manage authentication state on the client side.
 *
 * Token capability (`mode` from `/api/auth/token`) is fixed at login.
 * Effective access mode is a soft client preference (feature flag) stored in
 * localStorage and clamped so write is only effective when the token can write.
 */
export const AuthService = {
  async getAuthData(): Promise<AuthData | null> {
    try {
      const response = await fetch('/api/auth/token', {
        credentials: 'include',
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (!data.token) {
        return null;
      }

      return {
        token: data.token,
        mode: data.mode === 'write' ? 'write' : 'read',
      };
    } catch (error) {
      console.error('Error fetching auth data:', error);
      return null;
    }
  },

  async getToken(): Promise<string | null> {
    const authData = await this.getAuthData();
    return authData?.token || null;
  },

  /** Session/token capability from the server (not the UI preference). */
  async getTokenCapability(): Promise<'read' | 'write' | null> {
    const authData = await this.getAuthData();
    return authData?.mode || null;
  },

  /**
   * Effective access mode used by the UI and write gates.
   * Preference in localStorage, clamped by token capability.
   * Read-only tokens always resolve to read (and any stored write pref is scrubbed).
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
    // No preference yet: default to full capability of the token
    return capability;
  },

  /** Persist preference only; callers must enforce capability before choosing write. */
  persistEffectiveMode(mode: 'read' | 'write'): void {
    try {
      localStorage.setItem(EFFECTIVE_MODE_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Error saving effective mode preference:', error);
    }
    window.dispatchEvent(
      new CustomEvent('margea-effective-mode', { detail: { mode } }),
    );
  },

  /**
   * Soft set: effective mode preference without touching the session/token.
   * Returns false if write was requested but the token cannot write.
   */
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

  /**
   * Toggle effective mode; returns the new effective mode.
   * No-op (stays read) when the token cannot write.
   */
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

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      window.location.href = '/';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  },
};
