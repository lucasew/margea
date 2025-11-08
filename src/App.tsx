import { useState, useEffect } from 'react';
import { RelayEnvironmentProvider } from 'react-relay';
import { relayEnvironment } from './relay/environment';
import { AuthService } from './services/auth';
import { LoginPage } from './components/LoginPage';
import { MainPage } from './components/MainPage';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(AuthService.isAuthenticated());
  }, []);

  const handleLogin = (token: string) => {
    AuthService.saveToken(token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    AuthService.removeToken();
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <RelayEnvironmentProvider environment={relayEnvironment}>
      <MainPage onLogout={handleLogout} />
    </RelayEnvironmentProvider>
  );
}

export default App;
