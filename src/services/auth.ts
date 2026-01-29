/**
 * Represents the authentication data retrieved from the server.
 */
export interface AuthData {
  /** The GitHub OAuth access token. */
  token: string;
  /** The access mode granted to the user. */
  mode: 'read' | 'write';
}

/**
 * Service to manage authentication state on the client side.
 *
 * This service acts as a bridge between the React frontend and the backend authentication endpoints.
 * It handles:
 * - Retrieving the session token and permissions from the secure, HttpOnly cookie via the `/api/auth/token` endpoint.
 * - Checking authentication status and permissions.
 * - Logging out by calling the `/api/auth/logout` endpoint.
 *
 * Note: The actual session cookie is HttpOnly and cannot be accessed directly by JavaScript.
 * This service relies on the `/api/auth/token` endpoint to safely expose the necessary data (token, mode) to the client.
 */
export const AuthService = {
  /**
   * Retrieves the authentication data (token and mode) from the server.
   *
   * @returns A promise that resolves to `AuthData` if authenticated, or `null` otherwise.
   */
  async getAuthData(): Promise<AuthData | null> {
    try {
      const response = await fetch('/api/auth/token', {
        credentials: 'include', // Importante: envia cookies
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
        mode: data.mode || 'read',
      };
    } catch (error) {
      console.error('Error fetching auth data:', error);
      return null;
    }
  },

  /**
   * Retrieves the GitHub access token.
   *
   * @returns A promise that resolves to the token string, or `null` if not authenticated.
   */
  async getToken(): Promise<string | null> {
    const authData = await this.getAuthData();
    return authData?.token || null;
  },

  /**
   * Retrieves the user's permission mode ('read' or 'write').
   *
   * @returns A promise that resolves to the mode, or `null` if not authenticated.
   */
  async getPermissions(): Promise<'read' | 'write' | null> {
    const authData = await this.getAuthData();
    return authData?.mode || null;
  },

  /**
   * Checks if the user has 'write' permission.
   *
   * @returns `true` if the user has 'write' access, `false` otherwise.
   */
  async hasWritePermission(): Promise<boolean> {
    const mode = await this.getPermissions();
    return mode === 'write';
  },

  /**
   * Logs the user out.
   *
   * Calls the logout endpoint to clear the session cookie and then redirects to the home page.
   */
  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      // Recarregar página para limpar estado
      window.location.href = '/';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  },

  /**
   * Checks if the user is currently authenticated.
   *
   * @returns `true` if the user has a valid session, `false` otherwise.
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  },
};
