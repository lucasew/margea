import { Outlet } from 'react-router-dom';
import { MainLayoutContextType } from '../types';
import { Header } from './Header';
import { Footer } from './Footer';

export const MainLayout = (props: MainLayoutContextType) => {
  return (
    <div className="min-h-screen flex flex-col bg-base-100">
      <Header
        onLogout={props.onLogout}
        onLogin={props.onLogin}
        onChangePermissions={props.onChangePermissions}
        isAuthenticated={props.isAuthenticated}
        currentMode={props.currentMode}
      />
      <main className="flex-1 flex flex-col">
        <Outlet context={props} />
      </main>
      <Footer />
    </div>
  );
};
