import { useState, useEffect } from 'react';
import { AuthService } from '../services/auth';

export function useAuth() {
  const [hasWritePermission, setHasWritePermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<'read' | 'write' | null>(null);

  useEffect(() => {
    const checkPermissions = async () => {
      setIsLoading(true);
      const permissions = await AuthService.getPermissions();
      setHasWritePermission(permissions === 'write');
      setMode(permissions);
      setIsLoading(false);
    };

    checkPermissions();
  }, []);

  return {
    hasWritePermission,
    mode,
    isLoading,
  };
}
