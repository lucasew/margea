import { useLocation } from 'react-router-dom';
import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'react-feather';
import { Header } from './Header';
import { Footer } from './Footer';
import { PRList } from './PRList';
import { SearchForm } from './SearchForm';
import { useViewer } from '../hooks/useViewer';

interface MainPageProps {
  onLogout: () => void;
  onLogin: () => void;
  onChangePermissions?: () => void;
  isAuthenticated: boolean;
  currentMode?: 'read' | 'write' | null;
}

// Helper to convert pathname to search query
function pathnameToSearchQuery(pathname: string, author?: string, organizations?: Array<{ login: string }>): string | null {
  const cleanPath = pathname.replace(/^\/+|\/+$/g, '');

  if (!cleanPath) {
    return null; // home
  }

  const parts = cleanPath.split('/');

  // Build base query
  let query = 'is:pr';

  // Add author if provided
  if (author) {
    query += ` author:${author}`;
  }

  // /orgs - filter by user's organizations
  if (parts.length === 1 && parts[0] === 'orgs') {
    if (organizations && organizations.length > 0) {
      // Add org filter for each organization
      const orgFilters = organizations.map(org => `org:${org.login}`).join(' ');
      return `${query} ${orgFilters}`;
    }
    return query;
  }

  // /org/:orgName
  if (parts.length === 2 && parts[0] === 'org') {
    return `${query} org:${decodeURIComponent(parts[1])}`;
  }

  // /:orgName/:repoName
  if (parts.length === 2) {
    return `${query} repo:${decodeURIComponent(parts[0])}/${decodeURIComponent(parts[1])}`;
  }

  return null;
}

function MainPageContent({ onLogout, onLogin, onChangePermissions, isAuthenticated, currentMode }: MainPageProps) {
  const { t } = useTranslation();
  const location = useLocation();

  // Extract author from search params
  const searchParams = new URLSearchParams(location.search);
  const authorFromUrl = searchParams.get('author') || '';

  // Load organizations only if authenticated
  let organizations: Array<{ login: string }> = [];
  if (isAuthenticated) {
    try {
      const { organizations: orgs } = useViewer();
      organizations = orgs;
    } catch {
      // If query fails, just use empty list
    }
  }

  // Get search query from current pathname
  const searchQuery = pathnameToSearchQuery(location.pathname, authorFromUrl, organizations);

  return (
    <div className="min-h-screen flex flex-col bg-base-100">
      <Header
        onLogout={onLogout}
        onLogin={onLogin}
        onChangePermissions={onChangePermissions}
        isAuthenticated={isAuthenticated}
        currentMode={currentMode}
      />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-16">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6">Margea</h1>
          <p className="text-xl md:text-2xl text-base-content/70 max-w-3xl leading-relaxed">
            {t('homepage.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold border-b border-base-300 pb-3">{t('mainPage.search')}</h2>
              <SearchForm isAuthenticated={isAuthenticated} />
            </div>
          </div>

          <div className="lg:col-span-8">
            {searchQuery ? (
              <PRList key={location.pathname} searchQuery={searchQuery} />
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[400px] p-12 text-center">
                <div className="text-primary/50 mb-6">
                  <Search size={64} />
                </div>
                <h2 className="text-3xl font-bold mb-3">{t('mainPage.performSearch')}</h2>
                <p className="text-lg text-base-content/60 max-w-md">
                  {t('mainPage.useFormToSearch')}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function MainPage(props: MainPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      }
    >
      <MainPageContent {...props} />
    </Suspense>
  );
}
