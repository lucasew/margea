import { AuthContext } from '../context/AuthContext';
import { useRequiredContext } from '../utils/useRequiredContext';

export function useAuth() {
  return useRequiredContext(
    AuthContext,
    'useAuth must be used within an AuthProvider',
  );
}
