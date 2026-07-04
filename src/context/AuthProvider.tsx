import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { EFFECTIVE_MODE_STORAGE_KEY } from '../constants';
import { AuthService } from '../services/auth';
import { AuthContext, type AccessMode, type AuthStatus } from './AuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [currentMode, setCurrentMode] = useState<AccessMode | null>(null);
  const [tokenCapability, setTokenCapability] = useState<AccessMode | null>(
    null,
  );
  const [isReauthenticating, setIsReauthenticating] = useState(false);

  const applySession = useCallback(async (authenticated: boolean) => {
    if (!authenticated) {
      setStatus('unauthenticated');
      setCurrentMode(null);
      setTokenCapability(null);
      setIsReauthenticating(false);
      return;
    }

    const [mode, capability] = await Promise.all([
      AuthService.getPermissions(),
      AuthService.getTokenCapability(),
    ]);
    setCurrentMode(mode);
    setTokenCapability(capability);
    setStatus('authenticated');
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const authenticated = await AuthService.isAuthenticated();
      if (cancelled) return;
      await applySession(authenticated);
    })();
    return () => {
      cancelled = true;
    };
  }, [applySession]);

  useEffect(() => {
    const syncMode = async () => {
      if (status !== 'authenticated') return;
      const [mode, capability] = await Promise.all([
        AuthService.getPermissions(),
        AuthService.getTokenCapability(),
      ]);
      setCurrentMode(mode);
      setTokenCapability(capability);
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === EFFECTIVE_MODE_STORAGE_KEY) void syncMode();
    };
    const onLocal = () => {
      void syncMode();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('margea-effective-mode', onLocal);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('margea-effective-mode', onLocal);
    };
  }, [status]);

  const logout = useCallback(async () => {
    setIsReauthenticating(false);
    setStatus('unauthenticated');
    setCurrentMode(null);
    setTokenCapability(null);
    await AuthService.logout();
  }, []);

  const toggleMode = useCallback(async () => {
    if (!currentMode || tokenCapability !== 'write') return;
    const next = await AuthService.toggleEffectiveMode();
    if (next) setCurrentMode(next);
  }, [currentMode, tokenCapability]);

  const reauthenticate = useCallback(() => {
    if (status !== 'authenticated') return;
    setIsReauthenticating(true);
  }, [status]);

  return (
    <AuthContext.Provider
      value={{
        status,
        currentMode,
        tokenCapability,
        isReauthenticating,
        hasWritePermission: currentMode === 'write',
        logout,
        toggleMode,
        reauthenticate,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
