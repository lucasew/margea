import { useState, useEffect, useCallback } from 'react';
import { AuthService } from '../services/auth';

/**
 * Auth gates for write actions. `mode` is the effective (soft) mode;
 * `tokenCapability` is what the session JWT actually allows.
 */
export function useAuth() {
  const [hasWritePermission, setHasWritePermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<'read' | 'write' | null>(null);
  const [tokenCapability, setTokenCapability] = useState<
    'read' | 'write' | null
  >(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const [hasWrite, permissions, capability] = await Promise.all([
      AuthService.hasWritePermission(),
      AuthService.getPermissions(),
      AuthService.getTokenCapability(),
    ]);
    setHasWritePermission(hasWrite);
    setMode(permissions);
    setTokenCapability(capability);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // We intentionally invoke refresh on mount. Disabling the rule to avoid "cascading renders" warning
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  // Re-read when effective mode preference flips (same tab or other tabs)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'margea_effective_mode') refresh();
    };
    const onLocal = () => refresh();
    window.addEventListener('storage', onStorage);
    window.addEventListener('margea-effective-mode', onLocal);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('margea-effective-mode', onLocal);
    };
  }, [refresh]);

  return {
    hasWritePermission,
    mode,
    tokenCapability,
    isLoading,
    refresh,
  };
}
