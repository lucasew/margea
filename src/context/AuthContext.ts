import { createContext } from 'react';

export type AccessMode = 'read' | 'write';

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
