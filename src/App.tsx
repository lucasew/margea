import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RelayEnvironmentProvider } from 'react-relay';
import { relayEnvironment } from './relay/environment';
import { AuthService } from './services/auth';
import { LoginPage } from './components/LoginPage';
import { HomePage } from './pages/HomePage';
import { RepositoryPage } from './pages/RepositoryPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BulkActionProvider } from './context/BulkActionContext';
import { BulkActionToast } from './components/BulkActionToast';
import { GlobalBulkActionModal } from './components/GlobalBulkActionModal';

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

  const commonProps = {
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
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage {...commonProps} />} />
              <Route path="/orgs" element={<RepositoryPage {...commonProps} />} />
              <Route path="/org/:owner" element={<RepositoryPage {...commonProps} />} />
              <Route path="/:owner/:repo" element={<RepositoryPage {...commonProps} />} />
            </Routes>
            <BulkActionToast />
            <GlobalBulkActionModal />
          </BrowserRouter>
        </BulkActionProvider>
      </RelayEnvironmentProvider>
    </ErrorBoundary>
  );
}

export default App;
