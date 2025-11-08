import { useState, useEffect } from 'react';
import { RelayEnvironmentProvider } from 'react-relay';
import { relayEnvironment } from './relay/environment';
import { AuthService } from './services/auth';
import { LoginPage } from './components/LoginPage';
import { MainPage } from './components/MainPage';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    setIsAuthenticated(AuthService.isAuthenticated());
  }, []);

  const handleLogin = (token: string) => {
    AuthService.saveToken(token);
    setIsAuthenticated(true);
    setShowLogin(false);
  };

  const handleLogout = () => {
    AuthService.removeToken();
    setIsAuthenticated(false);
  };

  const handleShowLogin = () => {
    setShowLogin(true);
  };

  if (showLogin && !isAuthenticated) {
    return (
      <ErrorBoundary>
        <LoginPage onLogin={handleLogin} onSkip={() => setShowLogin(false)} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <RelayEnvironmentProvider environment={relayEnvironment}>
        <MainPage
          onLogout={handleLogout}
          onLogin={handleShowLogin}
          isAuthenticated={isAuthenticated}
        />
      </RelayEnvironmentProvider>
    </ErrorBoundary>
  );
}

export default App;
