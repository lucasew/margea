import { Suspense, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useViewer } from '../hooks/useViewer';
import { usePRContext } from '../context/PRContext';
import { PRList } from './PRList';

function Dashboard() {
  const { viewer, organizations } = useViewer();
  const { setSearchScopes, searchQuery } = usePRContext();

  useEffect(() => {
    const scopes = [
      ...organizations.map((org) => `org:${org.login}`),
      `user:${viewer.login}`,
    ];

    setSearchScopes(scopes.length > 0 ? scopes : [`involves:${viewer.login}`]);
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

/** Rendered only inside the authenticated app shell (see App.tsx). */
export function HomePage() {
  const { t } = useTranslation();

  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-2">
          <span className="loading loading-spinner loading-md text-primary" />
          <p className="text-sm text-base-content/60">{t('prList.loading')}</p>
        </div>
      }
    >
      <Dashboard />
    </Suspense>
  );
}
