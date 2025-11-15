export const AuthService = {
  async getToken(): Promise<string | null> {
    try {
      const response = await fetch('/api/auth/token', {
        credentials: 'include', // Importante: envia cookies
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.token || null;
    } catch (error) {
      console.error('Error fetching token:', error);
      return null;
    }
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
