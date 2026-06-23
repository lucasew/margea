import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { RefreshCw, AlertTriangle, AlertCircle, Plus } from 'react-feather';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      <div className="app-container py-5 sm:py-6">
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
          <div role="alert" className="alert alert-error mb-4 py-2.5 text-sm">
            <AlertCircle size={18} />
            <div>
              <h3 className="font-semibold text-sm">
                {t('prList.errorTitle')}
              </h3>
              <div className="text-xs opacity-90">{error.message}</div>
            </div>
          </div>
        )}

        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            {t('prList.groups')}
            <span className="badge badge-sm badge-neutral tabular-nums">
              {groups.length}
            </span>
          </h2>
          {isLoading && !isFetchingNextPage && (
            <span className="loading loading-spinner loading-sm text-primary" />
          )}
        </div>

        {groups.length === 0 && !isLoading && !error ? (
          <div role="alert" className="alert alert-info py-2.5 text-sm">
            <InfoIcon />
            <span>{t('prList.noPRs')}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {groups.map((group) => (
              <PRGroupCard
                key={group.key}
                group={group}
                onExpand={handleSelectGroup}
              />
            ))}
          </div>
        )}

        <div
          ref={sentinelRef}
          className="h-16 w-full flex items-center justify-center mt-6"
        >
          {isFetchingNextPage || (isLoading && groups.length > 0) ? (
            <div className="flex items-center gap-2 text-sm text-base-content/55">
              <span className="loading loading-spinner loading-sm text-primary" />
              {t('prList.loadingMore')}
            </div>
          ) : pageInfo.hasNextPage ? (
            <button
              type="button"
              onClick={() => loadNextPage()}
              className={`btn btn-sm btn-outline btn-primary gap-1.5 ${
                !hasActiveFilters
                  ? 'opacity-0 hover:opacity-100 focus:opacity-100'
                  : ''
              }`}
              aria-label={t('prList.loadMore')}
              title={t('prList.loadMore')}
            >
              <Plus size={16} aria-hidden />
              {t('prList.loadMore')}
            </button>
          ) : (
            groups.length > 0 &&
            !isLoading &&
            !error && (
              <span className="text-xs text-base-content/45">
                {t('prList.endOfList')}
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
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-6">
      <div className="app-panel w-full max-w-lg p-6 text-center">
        <AlertTriangle size={40} className="text-error mx-auto mb-3" />
        <h2 className="text-lg font-semibold mb-1">{t('prList.errorTitle')}</h2>
        <p className="text-sm text-base-content/70 mb-4">
          {t('prList.errorMessage')}
        </p>

        {error && (
          <div className="alert alert-error py-2 mb-4 text-left">
            <code className="text-xs break-all">{error.message}</code>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            resetErrorBoundary();
            onRetry();
          }}
          className="btn btn-primary btn-sm gap-1.5"
        >
          <RefreshCw size={15} aria-hidden />
          {t('prList.retry')}
        </button>
      </div>
    </div>
  );
}

export function PRList() {
  const { t } = useTranslation();
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
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-2">
            <span className="loading loading-spinner loading-md text-primary" />
            <p className="text-sm text-base-content/60">
              {t('prList.loading')}
            </p>
          </div>
        }
      >
        <PRListContent />
      </Suspense>
    </ReactErrorBoundary>
  );
}
