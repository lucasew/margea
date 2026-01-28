import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { useLazyLoadQuery, fetchQuery } from 'react-relay';
import { RefreshCw, AlertTriangle } from 'react-feather';
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary';
import { relayEnvironment } from '../relay/environment';
import { SearchPRsQuery } from '../queries/SearchPRsQuery';
import { SearchPRsQuery as SearchPRsQueryType } from '../queries/__generated__/SearchPRsQuery.graphql';
import { groupPullRequests, filterPullRequests, calculateStats } from '../services/prGrouping';
import { transformPR } from '../services/prTransformer';
import { PRGroupCard } from './PRGroupCard';
import { PRGroupDetail } from './PRGroupDetail';
import { InfoIcon } from './icons/InfoIcon';
import { PRGroup, PullRequest } from '../types';
import { PRState, DEFAULT_PR_TARGET, MAX_PR_TARGET, BATCH_SIZE, URL_SEARCH_PARAMS } from '../constants';
import { PRListStats } from './PRListStats';
import { PRListFilters } from './PRListFilters';

interface PRListContentProps {
  searchQuery: string;
  onRefresh: () => void;
}

/**
 * The core component for displaying and managing the list of Pull Requests.
 *
 * Responsibilities:
 * 1. **Data Lifecycle**: Manages the fetching of PRs from GitHub via Relay.
 * 2. **Pagination Strategy**: Implements a custom "target-based" pagination. unlike standard infinite scroll,
 *    it attempts to automatically fetch enough pages to reach a user-defined count (`prTarget`) of PRs.
 * 3. **Filter Persistence**: Synchronizes filter state with URL parameters and persists them in `sessionStorage`
 *    so users don't lose context when navigating away and back.
 * 4. **Grouping & Filtering**: Applies client-side filtering and grouping logic to the fetched dataset.
 */
function PRListContent({ searchQuery, onRefresh }: PRListContentProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const groupKey = searchParams.get(URL_SEARCH_PARAMS.GROUP);

  // Read filters from URL
  const filterRepo = searchParams.get(URL_SEARCH_PARAMS.REPO) || '';
  const filterState = (searchParams.get(URL_SEARCH_PARAMS.STATE) || 'ALL') as PRState;
  const filterAuthor = searchParams.get(URL_SEARCH_PARAMS.AUTHOR) || '';
  const filterOwner = searchParams.get(URL_SEARCH_PARAMS.OWNER) || '';

  // State for PR target/goal, synced with URL param
  const [prTarget, setPrTarget] = useState(() => {
    const limit = parseInt(searchParams.get(URL_SEARCH_PARAMS.LIMIT) || DEFAULT_PR_TARGET.toString(), 10);
    return limit > 0 && limit <= MAX_PR_TARGET ? limit : DEFAULT_PR_TARGET;
  });

  // Persist filters in sessionStorage
  // 'isRestored' acts as a latch to prevent overwriting the URL params with default values
  // before we've had a chance to read from sessionStorage.
  const [isRestored, setIsRestored] = useState(false);

  useEffect(() => {
    // Only restore on mount (when isRestored is false)
    if (isRestored) return;

    const storageKey = `margea_filters_${location.pathname}`;
    const stored = sessionStorage.getItem(storageKey);

    if (stored) {
      const storedParams = new URLSearchParams(stored);
      const newParams = new URLSearchParams(searchParams);
      let hasChanges = false;

      storedParams.forEach((value, key) => {
        // If current params don't have this key, restore it
        if (!newParams.has(key)) {
          newParams.set(key, value);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        setSearchParams(newParams, { replace: true });
      }
    }

    setIsRestored(true);
  }, [location.pathname, isRestored, searchParams, setSearchParams]);

  useEffect(() => {
    if (!isRestored) return;

    const storageKey = `margea_filters_${location.pathname}`;
    sessionStorage.setItem(storageKey, searchParams.toString());
  }, [searchParams, location.pathname, isRestored]);

  useEffect(() => {
    const limit = parseInt(searchParams.get(URL_SEARCH_PARAMS.LIMIT) || DEFAULT_PR_TARGET.toString(), 10);
    const validLimit = limit > 0 && limit <= MAX_PR_TARGET ? limit : DEFAULT_PR_TARGET;
    setPrTarget(validLimit);
  }, [searchParams]);

  // States for pagination
  // 'additionalPRs' stores pages beyond the first one (which comes from 'data').
  // This allows us to accumulate a large list of PRs client-side to meet the 'prTarget'.
  const [additionalPRs, setAdditionalPRs] = useState<PullRequest[]>([]);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Helper to update filters in URL
  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    // Preserve group param if it exists
    if (groupKey) {
      newParams.set(URL_SEARCH_PARAMS.GROUP, groupKey);
    }
    setSearchParams(newParams);
  };

  const handleLimitChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set(URL_SEARCH_PARAMS.LIMIT, value);
    setSearchParams(newParams, { replace: true });
  }

  const data = useLazyLoadQuery<SearchPRsQueryType>(
    SearchPRsQuery,
    {
      searchQuery,
      first: Math.min(BATCH_SIZE, prTarget),
    }
  );

  // Update pagination info from initial query and trigger auto-fetch
  useEffect(() => {
    setHasNextPage(data.search.pageInfo?.hasNextPage ?? false);
    setEndCursor(data.search.pageInfo?.endCursor ?? null);
    // Reset additional PRs when query changes
    setAdditionalPRs([]);
    setIsLoadingMore(false);
  }, [data]);

  // Transform Relay data to our PullRequest type
  const initialPRs: PullRequest[] = (data.search.edges || [])
    .map(edge => transformPR(edge?.node))
    .filter((pr): pr is PullRequest => pr !== null);

  // Combine initial PRs with additional PRs from pagination
  const prs: PullRequest[] = [...initialPRs, ...additionalPRs];

  const filteredPrs = filterPullRequests(prs, {
    repository: filterRepo,
    state: filterState,
    author: filterAuthor,
    owner: filterOwner,
  });

  const groups = groupPullRequests(filteredPrs);
  const stats = calculateStats(filteredPrs);

  // Extract unique values for dropdowns from ALL PRs (not filtered)
  const uniqueRepos = Array.from(new Set(prs.map(pr => `${pr.repository.owner.login}/${pr.repository.name}`))).sort();
  const uniqueOwners = Array.from(new Set(prs.map(pr => pr.repository.owner.login))).sort();
  const uniqueAuthors = Array.from(new Set(prs.map(pr => pr.author?.login).filter(Boolean) as string[])).sort();

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(groups, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'margea-pr-groups.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSelectGroup = (group: PRGroup) => {
    setSearchParams({ [URL_SEARCH_PARAMS.GROUP]: group.key });
  };

  const handleBackFromGroup = () => {
    navigate(-1);
  };

  /**
   * Fetches the next page of PRs.
   *
   * This is part of the custom "target-based" pagination loop.
   * It is called recursively (via the effect below) until the total number of loaded PRs
   * reaches `prTarget` or there are no more pages.
   */
  const fetchMorePRs = useCallback(async () => {
    if (!hasNextPage || !endCursor || isLoadingMore) return;

    const currentTotal = initialPRs.length + additionalPRs.length;
    if (currentTotal >= prTarget) return; // Already reached target

    setIsLoadingMore(true);
    try {
      const remainingToFetch = prTarget - currentTotal;
      const batchSize = Math.min(BATCH_SIZE, remainingToFetch);

      const result = await fetchQuery<SearchPRsQueryType>(
        relayEnvironment,
        SearchPRsQuery,
        {
          searchQuery,
          first: batchSize,
          after: endCursor,
        }
      ).toPromise();

      if (result?.search) {
        // Transform new PRs
        const newPRs: PullRequest[] = (result.search.edges || [])
          .map(edge => transformPR(edge?.node))
          .filter((pr): pr is PullRequest => pr !== null);

        setAdditionalPRs((prev) => [...prev, ...newPRs]);
        setHasNextPage(result.search.pageInfo?.hasNextPage ?? false);
        setEndCursor(result.search.pageInfo?.endCursor ?? null);
      }
    } catch (error) {
      console.error('Error loading more PRs:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    hasNextPage,
    endCursor,
    isLoadingMore,
    initialPRs.length,
    additionalPRs.length,
    prTarget,
    searchQuery,
  ]);

  // Auto-fetch to reach target
  useEffect(() => {
    const currentTotal = initialPRs.length + additionalPRs.length;
    const shouldFetchMore =
      hasNextPage && currentTotal < prTarget && !isLoadingMore;

    if (shouldFetchMore) {
      fetchMorePRs();
    }
  }, [
    initialPRs.length,
    additionalPRs.length,
    hasNextPage,
    prTarget,
    isLoadingMore,
    fetchMorePRs,
  ]);

  // Show group detail if a group is selected via query param
  if (groupKey) {
    const selectedGroup = groups.find(g => g.key === groupKey);
    if (selectedGroup) {
      return <PRGroupDetail group={selectedGroup} onBack={handleBackFromGroup} />;
    }
  }

  return (
    <div className="w-full">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <PRListStats stats={stats} />
        <PRListFilters
          filterRepo={filterRepo}
          filterOwner={filterOwner}
          filterAuthor={filterAuthor}
          filterState={filterState}
          uniqueRepos={uniqueRepos}
          uniqueOwners={uniqueOwners}
          uniqueAuthors={uniqueAuthors}
          prTarget={prTarget}
          onRefresh={onRefresh}
          onExportJSON={handleExportJSON}
          updateFilter={updateFilter}
          handleLimitChange={handleLimitChange}
        />

        {/* Groups */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            Grupos de PRs
            <div className="badge badge-lg badge-neutral">{groups.length}</div>
          </h2>
        </div>

        {groups.length === 0 ? (
          <div role="alert" className="alert alert-info shadow-lg">
            <InfoIcon />
            <span>Nenhum PR encontrado com os filtros aplicados.</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {groups.map((group) => (
                <PRGroupCard key={group.key} group={group} onExpand={handleSelectGroup} />
              ))}
            </div>

            {/* Loading progress indicator */}
            {isLoadingMore && (
              <div className="mt-8 flex flex-col items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="loading loading-spinner loading-md text-primary"></span>
                  <span className="text-lg">
                    Carregando PRs... {prs.length} de {prTarget}
                  </span>
                </div>
                <progress
                  className="progress progress-primary w-64"
                  value={prs.length}
                  max={prTarget}
                ></progress>
              </div>
            )}

            {/* Info when target reached or no more PRs */}
            {!isLoadingMore && prs.length > 0 && prs.length < prTarget && !hasNextPage && (
              <div className="mt-8 flex justify-center">
                <div className="alert alert-info max-w-md">
                  <InfoIcon />
                  <span>
                    Carregados {prs.length} PRs (meta: {prTarget}). Não há mais PRs disponíveis.
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface PRListProps {
  searchQuery: string;
}

/**
 * Fallback UI displayed when the PR list fails to load (e.g., network error, API rate limit).
 * Provides context on possible causes and a retry mechanism.
 */
function PRListErrorFallback({ error, resetErrorBoundary, onRetry }: FallbackProps & { onRetry: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
          <div className="card w-full max-w-2xl bg-base-100 shadow-xl">
            <div className="card-body items-center text-center">
              <AlertTriangle size={64} className="text-error mb-4" />
              <h2 className="card-title text-2xl mb-2">Erro ao carregar PRs</h2>
              <p className="text-base-content/70 mb-4">
                Não foi possível carregar os Pull Requests do GitHub.
              </p>

              {error && (
                <div className="alert alert-error w-full mb-4">
                  <div className="flex flex-col items-start gap-2 w-full">
                    <span className="font-semibold">Detalhes:</span>
                    <code className="text-sm bg-base-200 p-2 rounded w-full text-left overflow-x-auto">
                      {error.message}
                    </code>
                  </div>
                </div>
              )}

              <div className="alert alert-info w-full mb-4">
                <div className="flex flex-col items-start gap-2 w-full text-left">
                  <span className="font-semibold">Possíveis causas:</span>
                  <ul className="text-sm list-disc list-inside">
                    <li>Token de autenticação inválido ou expirado</li>
                    <li>Limite de requisições da API do GitHub excedido</li>
                    <li>Problemas de conectividade com a internet</li>
                    <li>Parâmetros de busca inválidos</li>
                  </ul>
                </div>
              </div>

              <div className="card-actions">
                <button
                  onClick={() => {
                    resetErrorBoundary();
                    onRetry();
                  }}
                  className="btn btn-primary"
                >
                  <RefreshCw size={18} />
                  Tentar novamente
                </button>
              </div>
            </div>
          </div>
        </div>
      );
}

export function PRList({ searchQuery }: PRListProps) {
  const [key, setKey] = useState(0);

  const handleRefresh = () => {
    setKey(prev => prev + 1);
  };

  const logError = (error: Error, info: { componentStack?: string | null }) => {
    console.error('PR List error:', error, info);
  };

  return (
    <ReactErrorBoundary
        FallbackComponent={(props) => <PRListErrorFallback {...props} onRetry={handleRefresh} />}
        onError={logError}
        onReset={() => {
            // Optional: any cleanup or state reset needed when boundary resets
        }}
    >
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="text-lg text-base-content/70">Carregando Pull Requests...</p>
          </div>
        }
      >
        <PRListContent key={key} searchQuery={searchQuery} onRefresh={handleRefresh} />
      </Suspense>
    </ReactErrorBoundary>
  );
}
