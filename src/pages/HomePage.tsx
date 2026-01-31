import { Suspense, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LogIn } from 'react-feather';
import { useViewer } from '../hooks/useViewer';
import { useMainLayoutContext } from '../hooks/useMainLayoutContext';
import { usePRContext } from '../context/PRContext';
import { PRList } from '../components/PRList';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

function AuthenticatedDashboard() {
  const { viewer, organizations } = useViewer();
  const { setSearchQuery, searchQuery } = usePRContext();

  useEffect(() => {
    // Construct the global query
    // is:pr state:open (org:A OR org:B OR user:login)
    const scopeParts = [
      ...organizations.map(org => `org:${org.login}`),
      `user:${viewer.login}`
    ];

    const scopeQuery = scopeParts.join(' OR ');

    // If scope is empty (weird), fallback to involves:@me?
    const finalScope = scopeQuery ? `(${scopeQuery})` : `involves:${viewer.login}`;

    const query = `is:pr state:open ${finalScope}`;

    // Only update if different
    if (query !== searchQuery) {
      setSearchQuery(query);
    }
  }, [viewer.login, organizations, setSearchQuery, searchQuery]);

  // If query not set yet, show loading
  if (!searchQuery) {
     return <div className="loading loading-spinner" />;
  }

  return <PRList />;
}

export function HomePage() {
  const {
    isAuthenticated,
    onLogin,
    onLogout,
    onChangePermissions,
    currentMode,
  } = useMainLayoutContext();
  const { t } = useTranslation();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-base-100">
        <Header
            onLogout={onLogout}
            onLogin={onLogin}
            onChangePermissions={onChangePermissions}
            isAuthenticated={isAuthenticated}
            currentMode={currentMode}
        />

        <main className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="text-center max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
                {t('homepage.title')}
            </h1>
            <p className="text-lg md:text-xl text-base-content/70 mb-8">
                {t('homepage.subtitle')}
            </p>

            <div className="alert alert-info mb-8 shadow-lg">
                <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="stroke-current shrink-0 w-6 h-6"
                >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
                </svg>
                <div className="flex-1 text-left">
                <span>{t('homepage.login_prompt')}</span>
                </div>
            </div>

            <button
                onClick={onLogin}
                className="btn btn-primary btn-lg gap-2 shadow-xl"
            >
                <LogIn size={20} />
                {t('header.login')}
            </button>
            </div>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      <Header
        onLogout={onLogout}
        onLogin={onLogin}
        onChangePermissions={onChangePermissions}
        isAuthenticated={isAuthenticated}
        currentMode={currentMode}
      />

      <main className="flex-1">
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[50vh]">
            <span className="loading loading-spinner loading-lg"></span>
            </div>
        }>
            <AuthenticatedDashboard />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
