import { useParams, useSearchParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { PRList } from '../components/PRList';

interface RepositoryPageProps {
  onLogout: () => void;
  onLogin: () => void;
  isAuthenticated: boolean;
}

// Helper to build search query from URL params
function buildSearchQuery(params: { owner?: string; repo?: string; author?: string }): string {
  const { owner, repo, author } = params;

  // Build base query
  let query = 'is:pr';

  // Add author filter if provided
  if (author) {
    query += ` author:${author}`;
  }

  // Add scope (repo, org, or all)
  if (owner && repo) {
    query += ` repo:${owner}/${repo}`;
  } else if (owner) {
    query += ` org:${owner}`;
  }

  return query;
}

export function RepositoryPage({ onLogout, onLogin, isAuthenticated }: RepositoryPageProps) {
  const params = useParams<{ owner?: string; repo?: string }>();
  const [searchParams] = useSearchParams();
  const author = searchParams.get('author') || undefined;

  const searchQuery = buildSearchQuery({ ...params, author });

  // Build page title
  let pageTitle = 'Todos os PRs';
  if (params.owner && params.repo) {
    pageTitle = `${params.owner}/${params.repo}`;
  } else if (params.owner) {
    pageTitle = params.owner;
  }

  // Add author to subtitle
  const subtitle = author ? `Pull Requests de ${author}` : 'Pull Requests';

  return (
    <div className="min-h-screen flex flex-col bg-base-100">
      <Header onLogout={onLogout} onLogin={onLogin} isAuthenticated={isAuthenticated} />

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

        {/* PR List with Dashboard */}
        <PRList searchQuery={searchQuery} />
      </main>

      <Footer />
    </div>
  );
}
