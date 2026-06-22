import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LogIn } from 'react-feather';
import { useViewer } from '../hooks/useViewer';
import { useMainLayoutContext } from '../hooks/useMainLayoutContext';
import { usePRContext } from '../context/PRContext';
import { PRList } from './PRList';
import { InfoIcon } from './icons/InfoIcon';

function AuthenticatedDashboard() {
  const { viewer, organizations } = useViewer();
  const { setSearchScopes, searchQuery } = usePRContext();

  useEffect(() => {
    const scopes = [
      ...organizations.map((org) => `org:${org.login}`),
      `user:${viewer.login}`,
    ];

    if (scopes.length === 0) {
      setSearchScopes([`involves:${viewer.login}`]);
      return;
    }

    setSearchScopes(scopes);
  }, [viewer.login, organizations, setSearchScopes]);

  if (!searchQuery) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <span className="loading loading-spinner loading-md text-primary" />
      </div>
    );
  }

  return <PRList />;
}

export function HomePage() {
  const { isAuthenticated, onLogin } = useMainLayoutContext();
  const { t } = useTranslation();

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-lg">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
            {t('homepage.title')}
          </h1>
          <p className="text-base text-base-content/70 mb-6">
            {t('homepage.subtitle')}
          </p>

          <div className="alert alert-info mb-6 text-sm text-left py-3">
            <InfoIcon />
            <span>{t('homepage.login_prompt')}</span>
          </div>

          <button
            type="button"
            onClick={onLogin}
            className="btn btn-primary gap-2"
          >
            <LogIn size={18} aria-hidden />
            {t('header.login')}
          </button>
        </div>
      </div>
    );
  }

  // ViewerQuery is owned by ViewerProvider at App root (no per-page Suspense).
  return <AuthenticatedDashboard />;
}
