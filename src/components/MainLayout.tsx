import { Outlet } from 'react-router-dom';

export type MainLayoutContextType = {
  onLogout: () => void;
  onLogin: () => void;
  onChangePermissions: () => void;
  isAuthenticated: boolean;
  currentMode: 'read' | 'write' | null;
};

export const MainLayout = (props: MainLayoutContextType) => {
  return <Outlet context={props} />;
};
