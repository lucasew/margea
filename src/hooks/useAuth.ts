import { useState, useEffect } from 'react';
import { AuthService } from '../services/auth';

/**
 * A custom hook to manage and access the current user's authentication state and permissions.
 *
 * This hook interacts with the `AuthService` to asynchronously fetch the user's
 * permission mode (e.g., 'read' or 'write') when the component mounts.
 *
 * It provides a reactive way to check if the user has write access, which is essential
 * for conditionally rendering UI elements like "Merge" or "Close" buttons.
 *
 * @returns An object containing:
 * - `hasWritePermission`: Boolean indicating if the user has write access (true) or read-only (false).
 * - `mode`: The specific permission mode string ('read' | 'write' | null).
 * - `isLoading`: Boolean indicating if the permission check is currently in progress.
 *
 * @example
 * const { hasWritePermission, isLoading } = useAuth();
 *
 * if (isLoading) return <Spinner />;
 * if (hasWritePermission) {
 *   return <MergeButton />;
 * }
 */
export function useAuth() {
  const [hasWritePermission, setHasWritePermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<'read' | 'write' | null>(null);

  useEffect(() => {
    const checkPermissions = async () => {
      setIsLoading(true);
      const hasWrite = await AuthService.hasWritePermission();
      const permissions = await AuthService.getPermissions();
      setHasWritePermission(hasWrite);
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
