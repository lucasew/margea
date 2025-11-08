import { useState, useEffect } from 'react';
import { RelayEnvironmentProvider } from 'react-relay';
import { relayEnvironment } from './relay/environment';
import { AuthService } from './services/auth';
import { LoginPage } from './components/LoginPage';
import { MainPage } from './components/MainPage';

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
    return <LoginPage onLogin={handleLogin} onSkip={() => setShowLogin(false)} />;
  }

  return (
    <RelayEnvironmentProvider environment={relayEnvironment}>
      <MainPage
        onLogout={handleLogout}
        onLogin={handleShowLogin}
        isAuthenticated={isAuthenticated}
      />
    </RelayEnvironmentProvider>
  );
}

export default App;
