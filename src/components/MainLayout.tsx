import { Outlet } from 'react-router-dom';
import { MainLayoutContextType } from '../hooks/useMainLayoutContext';

export const MainLayout = (props: MainLayoutContextType) => {
  return <Outlet context={props} />;
};
