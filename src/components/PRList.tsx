import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { RefreshCw, AlertTriangle, AlertCircle, Plus } from 'react-feather';
import {
  ErrorBoundary as ReactErrorBoundary,
  FallbackProps,
} from 'react-error-boundary';
import { filterPullRequests } from '../services/prFilter';
import { calculateStats } from '../services/prStats';
import { PRGroupCard } from './PRGroupCard';
import { PRGroupDetail } from './PRGroupDetail';
import { InfoIcon } from './icons/InfoIcon';
import { PRGroup, GroupingStrategy } from '../types';
import { PRState, URL_SEARCH_PARAMS } from '../constants';
import { PRListStats } from './PRListStats';
import { PRListFilters } from './PRListFilters';
import { usePRContext } from '../context/PRContext';
import { useStablePRGroups } from '../hooks/useStablePRGroups';

function PRListContent() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const {
    prMap,
    loadNextPage,
    pageInfo,
    isFetchingNextPage,
    refresh,
    isLoading,
    error,
  } = usePRContext();

  const groupKey = searchParams.get(URL_SEARCH_PARAMS.GROUP);

  // Read filters from URL
  const filterRepo = searchParams.get(URL_SEARCH_PARAMS.REPO) || '';
  const filterState = (searchParams.get(URL_SEARCH_PARAMS.STATE) ||
    'ALL') as PRState;
  const filterAuthor = searchParams.get(URL_SEARCH_PARAMS.AUTHOR) || '';
  const filterOwner = searchParams.get(URL_SEARCH_PARAMS.OWNER) || '';
  const groupBy =
    (searchParams.get(URL_SEARCH_PARAMS.GROUP_BY) as GroupingStrategy) ||
    'renovate';

  // Persist filters in sessionStorage
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

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsRestored(true);
  }, [location.pathname, isRestored, searchParams, setSearchParams]);

  useEffect(() => {
    if (!isRestored) return;

    const storageKey = `margea_filters_${location.pathname}`;
    sessionStorage.setItem(storageKey, searchParams.toString());
  }, [searchParams, location.pathname, isRestored]);

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

  const allPRs = Array.from(prMap.values());

  const filteredPrs = filterPullRequests(allPRs, {
    repository: filterRepo,
    state: filterState,
    author: filterAuthor,
    owner: filterOwner,
  });

  // Calculate stats from the filtered set
  const stats = calculateStats(filteredPrs);

  // Use stable grouping
  // Construct a filter hash to reset stability if filters change
  const filterHash = `${filterRepo}|${filterState}|${filterAuthor}|${filterOwner}|${groupBy}`;
  const groups = useStablePRGroups(filteredPrs, filterHash, groupBy);

  // Extract unique values for dropdowns from ALL PRs (not filtered)
  const uniqueRepos = Array.from(
    new Set(
      allPRs.map((pr) => `${pr.repository.owner.login}/${pr.repository.name}`),
    ),
  ).sort();
  const uniqueOwners = Array.from(
    new Set(allPRs.map((pr) => pr.repository.owner.login)),
  ).sort();
  const uniqueAuthors = Array.from(
    new Set(allPRs.map((pr) => pr.author?.login).filter(Boolean) as string[]),
  ).sort();

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

  // Infinite Scroll Sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Disable auto-load if any filter is active
  const hasActiveFilters = Boolean(
    filterRepo || filterState !== 'ALL' || filterAuthor || filterOwner,
  );

  useEffect(() => {
    if (hasActiveFilters) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          pageInfo.hasNextPage &&
          !isFetchingNextPage &&
          !isLoading
        ) {
          loadNextPage();
        }
      },
      { rootMargin: '400px' }, // Load well before reaching bottom
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [
    pageInfo.hasNextPage,
    isFetchingNextPage,
    isLoading,
    loadNextPage,
    hasActiveFilters,
  ]);

  // Show group detail if a group is selected via query param
  if (groupKey) {
    // Note: We search in current groups. If filters exclude the group, it might be missing.
    // We could fallback to searching allPRs to rebuild the group if needed,
    // but usually user navigates from list to detail.
    const selectedGroup = groups.find((g) => g.key === groupKey);
    if (selectedGroup) {
      return (
        <PRGroupDetail group={selectedGroup} onBack={handleBackFromGroup} />
      );
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
          groupBy={groupBy}
          uniqueRepos={uniqueRepos}
          uniqueOwners={uniqueOwners}
          uniqueAuthors={uniqueAuthors}
          onRefresh={refresh}
          onExportJSON={handleExportJSON}
          updateFilter={updateFilter}
        />

        {error && (
          <div role="alert" className="alert alert-error mb-6 shadow-lg">
            <AlertCircle />
            <div>
              <h3 className="font-bold">Error loading PRs</h3>
              <div className="text-xs">{error.message}</div>
            </div>
          </div>
        )}

        {/* Groups */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            Grupos de PRs
            <div className="badge badge-lg badge-neutral">{groups.length}</div>
          </h2>
          {isLoading && !isFetchingNextPage && (
            <span className="loading loading-spinner loading-md"></span>
          )}
        </div>

        {groups.length === 0 && !isLoading && !error ? (
          <div role="alert" className="alert alert-info shadow-lg">
            <InfoIcon />
            <span>Nenhum PR encontrado com os filtros aplicados.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {groups.map((group) => (
              <PRGroupCard
                key={group.key}
                group={group}
                onExpand={handleSelectGroup}
              />
            ))}
          </div>
        )}

        {/* Sentinel & Loader for Infinite Scroll */}
        <div
          ref={sentinelRef}
          className="h-20 w-full flex items-center justify-center mt-8"
        >
          {isFetchingNextPage || (isLoading && groups.length > 0) ? (
            <div className="flex flex-col items-center gap-2">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <span className="text-sm opacity-50">Carregando mais...</span>
            </div>
          ) : pageInfo.hasNextPage ? (
            // Show button if manually loading (filters active) or auto-load fallback
            <button
              onClick={() => loadNextPage()}
              className={`btn btn-circle btn-outline btn-primary shadow-md hover:scale-110 transition-transform ${
                !hasActiveFilters ? 'opacity-0 hover:opacity-100' : ''
              }`}
              aria-label="Carregar mais"
              title="Carregar mais"
            >
              <Plus size={24} />
            </button>
          ) : (
            groups.length > 0 &&
            !isLoading &&
            !error && (
              <span className="text-sm opacity-50">
                Isso é tudo, pessoal! 🐰
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function PRListErrorFallback({
  error,
  resetErrorBoundary,
  onRetry,
}: FallbackProps & { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
      <div className="card w-full max-w-2xl bg-base-100 shadow-xl">
        <div className="card-body items-center text-center">
          <AlertTriangle size={64} className="text-error mb-4" />
          <h2 className="card-title text-2xl mb-2">Erro ao carregar PRs</h2>
          <p className="text-base-content/70 mb-4">
            Não foi possível carregar os Pull Requests.
          </p>

          {error && (
            <div className="alert alert-error w-full mb-4">
              <code className="text-sm bg-base-200 p-2 rounded w-full text-left overflow-x-auto">
                {error.message}
              </code>
            </div>
          )}

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

export function PRList() {
  const { refresh } = usePRContext();

  const logError = (error: Error, info: { componentStack?: string | null }) => {
    console.error('PR List error:', error, info);
  };

  return (
    <ReactErrorBoundary
      FallbackComponent={(props) => (
        <PRListErrorFallback {...props} onRetry={refresh} />
      )}
      onError={logError}
    >
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="text-lg text-base-content/70">
              Carregando Pull Requests...
            </p>
          </div>
        }
      >
        <PRListContent />
      </Suspense>
    </ReactErrorBoundary>
  );
}
