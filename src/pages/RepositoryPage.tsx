import { useParams } from 'react-router-dom';
import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { PRList } from '../components/PRList';
import { useViewer } from '../hooks/useViewer';
import { sanitize } from '../services/sanitizer';

interface RepositoryPageProps {
  onLogout: () => void;
  onLogin: () => void;
  onChangePermissions?: () => void;
  isAuthenticated: boolean;
  currentMode?: 'read' | 'write' | null;
}

// Helper to build search query from URL params
function buildSearchQuery(
  params: { owner?: string; repo?: string },
  organizations?: Array<{ login: string }>,
  userLogin?: string
): string {
  const { owner, repo } = params;

  // Build base query
  let query = 'is:pr';

  // Add scope (repo, org, or all orgs)
  if (owner && repo) {
    query += ` repo:${owner}/${repo}`;
  } else if (owner) {
    query += ` org:${owner}`;
  } else if (organizations && organizations.length > 0) {
    // /orgs route - filter by user's organizations and user's own PRs
    const orgFilters = organizations.map(org => `org:${org.login}`).join(' ');
    query += ` ${orgFilters}`;

    // Also include PRs authored by the user
    if (userLogin) {
      query += ` author:${userLogin}`;
    }
  }

  return query;
}

function RepositoryPageContent({ onLogout, onLogin, onChangePermissions, isAuthenticated, currentMode }: RepositoryPageProps) {
  const { t } = useTranslation();
  const rawParams = useParams<{ owner?: string; repo?: string }>();

  // 🛡️ SENTINEL: Sanitize URL parameters to prevent injection attacks.
  const params = {
    owner: sanitize(rawParams.owner),
    repo: sanitize(rawParams.repo),
  };

  // Load organizations only if authenticated and on /orgs route
  let organizations: Array<{ login: string }> = [];
  let userLogin: string | undefined;
  if (isAuthenticated && !params.owner && !params.repo) {
    try {
      const { organizations: orgs, viewer } = useViewer();
      // 🛡️ SENTINEL: Sanitize API data as a defense-in-depth measure.
      organizations = orgs.map(org => ({ ...org, login: sanitize(org.login) ?? '' }));
      userLogin = sanitize(viewer.login);
    } catch {
      // If query fails, just use empty list
    }
  }

  const searchQuery = buildSearchQuery(params, organizations, userLogin);

  // Build page title
  let pageTitle = t('repositoryPage.allPRs');
  if (params.owner && params.repo) {
    pageTitle = `${params.owner}/${params.repo}`;
  } else if (params.owner) {
    pageTitle = params.owner;
  }

  const subtitle = t('repositoryPage.pullRequests');

  return (
    <div className="min-h-screen flex flex-col bg-base-100">
      <Header
        onLogout={onLogout}
        onLogin={onLogin}
        onChangePermissions={onChangePermissions}
        isAuthenticated={isAuthenticated}
        currentMode={currentMode}
      />

      <main className="flex-1">
        {/* Page Header */}
        <div className="bg-base-200 border-b border-base-300">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-3xl md:text-4xl font-bold">{pageTitle}</h1>
            <p className="text-base-content/70 mt-2">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Show login required message if not authenticated */}
        {!isAuthenticated ? (
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="alert alert-warning shadow-lg max-w-2xl mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="font-bold">{t('repositoryPage.loginRequired')}</h3>
                <div className="text-sm">
                  {t('repositoryPage.loginRequiredMessage')}
                </div>
              </div>
              <button onClick={onLogin} className="btn btn-sm btn-primary">
                {t('repositoryPage.login')}
              </button>
            </div>
          </div>
        ) : (
          /* PR List with Dashboard */
          <PRList searchQuery={searchQuery} />
        )}
      </main>

      <Footer />
    </div>
  );
}

export function RepositoryPage(props: RepositoryPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      }
    >
      <RepositoryPageContent {...props} />
    </Suspense>
  );
}
