import React from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';

type ContextType = {
  onLogout: () => void;
  onLogin: () => void;
  onChangePermissions: () => void;
  isAuthenticated: boolean;
  currentMode: 'read' | 'write' | null;
};

export function useMainLayoutContext() {
  return useOutletContext<ContextType>();
}

export const MainLayout: React.FC<ContextType> = (props) => {
  return <Outlet context={props} />;
};
