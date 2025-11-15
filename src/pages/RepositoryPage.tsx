import { useParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { PRList } from '../components/PRList';

interface RepositoryPageProps {
  onLogout: () => void;
  onLogin: () => void;
  isAuthenticated: boolean;
}

// Helper to build search query from URL params
function buildSearchQuery(params: { owner?: string; repo?: string }): string {
  const { owner, repo } = params;

  if (owner && repo) {
    return `is:pr author:renovate[bot] repo:${owner}/${repo}`;
  }

  if (owner) {
    return `is:pr author:renovate[bot] org:${owner}`;
  }

  // All orgs
  return 'is:pr author:renovate[bot]';
}

export function RepositoryPage({ onLogout, onLogin, isAuthenticated }: RepositoryPageProps) {
  const params = useParams<{ owner?: string; repo?: string }>();
  const searchQuery = buildSearchQuery(params);

  // Build page title
  let pageTitle = 'Todos os PRs';
  if (params.owner && params.repo) {
    pageTitle = `${params.owner}/${params.repo}`;
  } else if (params.owner) {
    pageTitle = params.owner;
  }

  return (
    <div className="min-h-screen flex flex-col bg-base-100">
      <Header onLogout={onLogout} onLogin={onLogin} isAuthenticated={isAuthenticated} />

      <main className="flex-1">
        {/* Page Header */}
        <div className="bg-base-200 border-b border-base-300">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-3xl md:text-4xl font-bold">{pageTitle}</h1>
            <p className="text-base-content/70 mt-2">
              Pull Requests do Renovate Bot
            </p>
          </div>
        </div>

        {/* PR List with Dashboard */}
        <PRList searchQuery={searchQuery} />
      </main>

      <Footer />
    </div>
  );
}
