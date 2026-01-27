import { Outlet } from 'react-router-dom';
import { MainLayoutContextType } from '../types';

export const MainLayout = (props: MainLayoutContextType) => {
  return <Outlet context={props} />;
};
