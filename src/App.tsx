import './i18n';

import { useState, useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RelayEnvironmentProvider } from 'react-relay';
import { relayEnvironment } from './relay/environment';
import { AuthService } from './services/auth';
import { LoginPage } from './components/LoginPage';
import { HomePage } from './components/HomePage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BulkActionProvider } from './context/BulkActionProvider';
import { PRProvider } from './context/PRProvider';
import { ViewerProvider } from './context/ViewerProvider';
import { BulkActionToast } from './components/BulkActionToast';
import { GlobalBulkActionModal } from './components/GlobalBulkActionModal';
import { MainLayout } from './components/MainLayout';
import { FetcherProgressHint } from './components/FetcherProgressHint';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMode, setCurrentMode] = useState<'read' | 'write' | null>(null);
  const [tokenCapability, setTokenCapability] = useState<
    'read' | 'write' | null
  >(null);

  useEffect(() => {
    // Verificar autenticação no mount
    AuthService.isAuthenticated().then((authenticated) => {
      setIsAuthenticated(authenticated);
      if (authenticated) {
        Promise.all([
          AuthService.getPermissions(),
          AuthService.getTokenCapability(),
        ]).then(([mode, capability]) => {
          setCurrentMode(mode);
          setTokenCapability(capability);
        });
      }
      setIsLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    await AuthService.logout();
    setIsAuthenticated(false);
    setCurrentMode(null);
    setTokenCapability(null);
    setShowLogin(true); // Mostrar tela de login após logout
  };

  const handleShowLogin = () => {
    setShowLogin(true);
  };

  /** Soft feature flag: flip effective mode in localStorage, no token change. */
  const handleToggleMode = async () => {
    if (!currentMode || tokenCapability !== 'write') return;
    const next = await AuthService.toggleEffectiveMode();
    if (next) setCurrentMode(next);
  };

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="app-shell items-center justify-center">
        <span className="loading loading-spinner loading-md text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || showLogin) {
    return (
      <ErrorBoundary>
        <LoginPage currentMode={currentMode} />
      </ErrorBoundary>
    );
  }

  const mainLayoutProps = {
    onLogout: handleLogout,
    onLogin: handleShowLogin,
    onToggleMode: handleToggleMode,
    isAuthenticated,
    currentMode,
    tokenCapability,
  };

  return (
    <ErrorBoundary>
      <RelayEnvironmentProvider environment={relayEnvironment}>
        <Suspense
          fallback={
            <div className="app-shell items-center justify-center">
              <span className="loading loading-spinner loading-md text-primary" />
            </div>
          }
        >
          <ViewerProvider>
            <PRProvider>
              <BulkActionProvider>
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<MainLayout {...mainLayoutProps} />}>
                      <Route index element={<HomePage />} />
                      {/* Redirect old routes to home */}
                      <Route path="/orgs" element={<Navigate to="/" replace />} />
                      <Route
                        path="/org/:owner"
                        element={<Navigate to="/" replace />}
                      />
                      <Route
                        path="/:owner/:repo"
                        element={<Navigate to="/" replace />}
                      />
                    </Route>
                  </Routes>
                  <div className="toast toast-end z-50">
                    <BulkActionToast />
                    <FetcherProgressHint />
                  </div>
                  <GlobalBulkActionModal />
                </BrowserRouter>
              </BulkActionProvider>
            </PRProvider>
          </ViewerProvider>
        </Suspense>
      </RelayEnvironmentProvider>
    </ErrorBoundary>
  );
}

export default App;
