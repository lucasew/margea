import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RelayEnvironmentProvider } from 'react-relay';
import { relayEnvironment } from './relay/environment';
import { AuthService } from './services/auth';
import { LoginPage } from './components/LoginPage';
import { HomePage } from './pages/HomePage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BulkActionProvider } from './context/BulkActionProvider';
import { PRProvider } from './context/PRProvider';
import { BulkActionToast } from './components/BulkActionToast';
import { GlobalBulkActionModal } from './components/GlobalBulkActionModal';
import { MainLayout } from './components/MainLayout';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMode, setCurrentMode] = useState<'read' | 'write' | null>(null);

  useEffect(() => {
    // Verificar autenticação no mount
    AuthService.isAuthenticated().then((authenticated) => {
      setIsAuthenticated(authenticated);
      if (authenticated) {
        // Se autenticado, buscar o modo atual
        AuthService.getPermissions().then((mode) => {
          setCurrentMode(mode);
        });
      }
      setIsLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    await AuthService.logout();
    setIsAuthenticated(false);
    setCurrentMode(null);
    setShowLogin(true); // Mostrar tela de login após logout
  };

  const handleShowLogin = () => {
    setShowLogin(true);
  };

  const handleChangePermissions = () => {
    setShowLogin(true); // Mostrar tela de login para escolher novo modo
  };

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (showLogin) {
    return (
      <ErrorBoundary>
        <LoginPage
          onSkip={isAuthenticated ? undefined : () => setShowLogin(false)}
          currentMode={currentMode}
        />
      </ErrorBoundary>
    );
  }

  const mainLayoutProps = {
    onLogout: handleLogout,
    onLogin: handleShowLogin,
    onChangePermissions: handleChangePermissions,
    isAuthenticated,
    currentMode,
  };

  return (
    <ErrorBoundary>
      <RelayEnvironmentProvider environment={relayEnvironment}>
        <BulkActionProvider>
          <PRProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<MainLayout {...mainLayoutProps} />}>
                  <Route index element={<HomePage />} />
                  {/* Redirect old routes to home */}
                  <Route path="/orgs" element={<Navigate to="/" replace />} />
                  <Route path="/org/:owner" element={<Navigate to="/" replace />} />
                  <Route path="/:owner/:repo" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
              <BulkActionToast />
              <GlobalBulkActionModal />
            </BrowserRouter>
          </PRProvider>
        </BulkActionProvider>
      </RelayEnvironmentProvider>
    </ErrorBoundary>
  );
}

export default App;
