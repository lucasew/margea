import { createContext } from 'react';
import type { AccessMode } from '../types';

export type { AccessMode };

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextType {
  status: AuthStatus;
  currentMode: AccessMode | null;
  tokenCapability: AccessMode | null;
  /** Session still exists; user is picking a new access level on LoginPage. */
  isReauthenticating: boolean;
  hasWritePermission: boolean;
  logout: () => Promise<void>;
  toggleMode: () => Promise<void>;
  reauthenticate: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);
