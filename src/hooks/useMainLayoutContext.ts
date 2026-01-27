import { useOutletContext } from 'react-router-dom';

export type MainLayoutContextType = {
  onLogout: () => void;
  onLogin: () => void;
  onChangePermissions: () => void;
  isAuthenticated: boolean;
  currentMode: 'read' | 'write' | null;
};

export function useMainLayoutContext() {
  return useOutletContext<MainLayoutContextType>();
}
