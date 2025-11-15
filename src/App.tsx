import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RelayEnvironmentProvider } from 'react-relay';
import { relayEnvironment } from './relay/environment';
import { AuthService } from './services/auth';
import { LoginPage } from './components/LoginPage';
import { HomePage } from './pages/HomePage';
import { RepositoryPage } from './pages/RepositoryPage';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar autenticação no mount
    AuthService.isAuthenticated().then((authenticated) => {
      setIsAuthenticated(authenticated);
      setIsLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    await AuthService.logout();
    setIsAuthenticated(false);
  };

  const handleShowLogin = () => {
    setShowLogin(true);
  };

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (showLogin && !isAuthenticated) {
    return (
      <ErrorBoundary>
        <LoginPage onSkip={() => setShowLogin(false)} />
      </ErrorBoundary>
    );
  }

  const commonProps = {
    onLogout: handleLogout,
    onLogin: handleShowLogin,
    isAuthenticated,
  };

  return (
    <ErrorBoundary>
      <RelayEnvironmentProvider environment={relayEnvironment}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage {...commonProps} />} />
            <Route path="/orgs" element={<RepositoryPage {...commonProps} />} />
            <Route path="/org/:owner" element={<RepositoryPage {...commonProps} />} />
            <Route path="/:owner/:repo" element={<RepositoryPage {...commonProps} />} />
          </Routes>
        </BrowserRouter>
      </RelayEnvironmentProvider>
    </ErrorBoundary>
  );
}

export default App;
