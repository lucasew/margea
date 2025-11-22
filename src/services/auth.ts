export interface AuthData {
  token: string;
  mode: 'read' | 'write';
}

export const AuthService = {
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

  async getToken(): Promise<string | null> {
    const authData = await this.getAuthData();
    return authData?.token || null;
  },

  async getPermissions(): Promise<'read' | 'write' | null> {
    const authData = await this.getAuthData();
    return authData?.mode || null;
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
      // Recarregar página para limpar estado
      window.location.href = '/';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }
};
