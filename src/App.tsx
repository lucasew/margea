import './i18n';

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RelayEnvironmentProvider } from 'react-relay';
import { relayEnvironment } from './relay/environment';
import { LoginPage } from './components/LoginPage';
import { HomePage } from './components/HomePage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthProvider';
import { BulkActionProvider } from './context/BulkActionProvider';
import { PRProvider } from './context/PRProvider';
import { BulkActionToast } from './components/BulkActionToast';
import { GlobalBulkActionModal } from './components/GlobalBulkActionModal';
import { MainLayout } from './components/MainLayout';
import { FetcherProgressHint } from './components/FetcherProgressHint';
import { useAuth } from './hooks/useAuth';

function AuthenticatedApp() {
  return (
    <RelayEnvironmentProvider environment={relayEnvironment}>
      <PRProvider>
        <BulkActionProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<HomePage />} />
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
            <div className="toast toast-end items-end z-[1000]">
              <BulkActionToast />
              <FetcherProgressHint />
            </div>
            <GlobalBulkActionModal />
          </BrowserRouter>
        </BulkActionProvider>
      </PRProvider>
    </RelayEnvironmentProvider>
  );
}

function AppShell() {
  const { status, isReauthenticating } = useAuth();

  if (status === 'loading') {
    return (
      <div className="app-shell items-center justify-center">
        <span className="loading loading-spinner loading-md text-primary" />
      </div>
    );
  }

  if (status === 'unauthenticated' || isReauthenticating) {
    return <LoginPage />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
