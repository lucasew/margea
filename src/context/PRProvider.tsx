import { useState, useCallback, useRef, ReactNode } from 'react';
import { useRelayEnvironment } from 'react-relay';
import { PRContext } from './PRContext';
import { PRContextType, PullRequest } from '../types';
import { fetchScopes, AdaptiveFetchState } from '../services/prFetchService';
import { INITIAL_FETCH_DAYS, LOAD_MORE_DAYS } from '../constants';

const DAY_MS = 24 * 60 * 60 * 1000;

interface PRProviderProps {
  children: ReactNode;
}

export function PRProvider({ children }: PRProviderProps) {
  const environment = useRelayEnvironment();

  // Map Key: Pull Request ID (Global Node ID)
  const [prMap, setPrMap] = useState<Map<string, PullRequest>>(new Map());
  const [pageInfo, setPageInfo] = useState<{
    endCursor: string | null;
    hasNextPage: boolean;
  }>({
    endCursor: null,
    hasNextPage: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [searchQuery, setSearchQueryState] = useState('');
  const [error, setError] = useState<Error | null>(null);

  // Track active scopes, abort controller, and per-scope adaptive state
  const abortRef = useRef<AbortController | null>(null);
  const scopesRef = useRef<string[]>([]);
  const scopeKeyRef = useRef('');
  const adaptiveStatesRef = useRef<Map<string, AdaptiveFetchState>>(new Map());

  const mergePRBatch = useCallback((newPRs: PullRequest[]) => {
    setPrMap((prev) => {
      const next = new Map(prev);
      newPRs.forEach((pr) => next.set(pr.id, pr));
      return next;
    });
  }, []);

  /**
   * Internal: runs the parallel adaptive fetch for all scopes.
   * Handles both initial fetch and load-more.
   */
  const startFetch = useCallback(
    (
      scopes: string[],
      endDate: Date,
      startDate: Date,
      savedStates: Map<string, AdaptiveFetchState> | null,
      isLoadMore: boolean,
      clearExisting: boolean,
    ) => {
      // Cancel any in-flight fetch
      if (abortRef.current) {
        abortRef.current.abort();
      }

      if (clearExisting) {
        setPrMap(new Map());
      }

      if (!isLoadMore) {
        adaptiveStatesRef.current = new Map();
        setIsLoading(true);
      } else {
        setIsFetchingNextPage(true);
      }
      setError(null);

      const controller = fetchScopes(
        environment,
        scopes,
        endDate,
        startDate,
        savedStates,
        {
          onBatch: mergePRBatch,

          onScopeProgress: (progress) => {
            // Once first results arrive, switch from "loading" to "fetching more"
            if (!isLoadMore && progress.fetched > 0) {
              setIsLoading(false);
              setIsFetchingNextPage(true);
            }
          },

          onComplete: (results, states) => {
            // Persist adaptive states for the next "load more"
            states.forEach((state, scope) => {
              adaptiveStatesRef.current.set(scope, state);
            });

            setIsLoading(false);
            setIsFetchingNextPage(false);

            // If load-more yielded 0 PRs across all scopes, stop offering more
            const totalNewPRs = results.reduce((sum, r) => sum + r.fetched, 0);
            const hasMore = isLoadMore ? totalNewPRs > 0 : true;
            setPageInfo({ endCursor: null, hasNextPage: hasMore });

            // Collect errors from failed scopes
            const errors = results.filter((r) => r.error !== null);
            if (errors.length > 0) {
              const scopeNames = errors.map((e) => e.scope).join(', ');
              setError(
                new Error(
                  `Failed to fetch PRs for: ${scopeNames}. ${errors[0].error?.message ?? ''}`,
                ),
              );
            }
          },
        },
      );

      abortRef.current = controller;
    },
    [environment, mergePRBatch],
  );

  /**
   * Primary entry point: starts fetching the last 7 days for all scopes in parallel.
   * Each scope auto-paginates with adaptive time windows.
   */
  const setSearchScopes = useCallback(
    (scopes: string[]) => {
      // Dedup: skip if the same scopes are passed again (effect re-fires
      // when organizations is a new array reference on each render).
      const newKey = scopes.slice().sort().join('\n');
      if (newKey === scopeKeyRef.current) return;
      scopeKeyRef.current = newKey;

      scopesRef.current = scopes;

      const syntheticQuery =
        scopes.length > 0 ? `is:pr ${scopes.join(' or ')}` : '';
      setSearchQueryState(syntheticQuery);

      if (scopes.length === 0) {
        setPrMap(new Map());
        setPageInfo({ endCursor: null, hasNextPage: false });
        return;
      }

      const now = new Date();
      const startDate = new Date(now.getTime() - INITIAL_FETCH_DAYS * DAY_MS);
      startFetch(scopes, now, startDate, null, false, true);
    },
    [startFetch],
  );

  /**
   * Convenience wrapper for backward compatibility.
   */
  const setSearchQuery = useCallback(
    (query: string) => {
      const scope = query.replace(/^is:pr\s+/, '');
      if (scope) {
        setSearchScopes([scope]);
      }
    },
    [setSearchScopes],
  );

  /**
   * Refresh: re-fetch the same scopes and merge results by ID.
   * Existing PRs stay visible while fresh data overwrites them in place.
   */
  const refresh = useCallback(() => {
    const scopes = scopesRef.current;
    if (scopes.length === 0) return;

    const now = new Date();
    const startDate = new Date(now.getTime() - INITIAL_FETCH_DAYS * DAY_MS);
    startFetch(scopes, now, startDate, null, false, false);
  }, [startFetch]);

  /**
   * Load more: extends each scope backwards from where it stopped.
   * Each scope resumes with its tuned adaptive interval.
   */
  const loadNextPage = useCallback(() => {
    if (isLoading || isFetchingNextPage || scopesRef.current.length === 0) {
      return;
    }

    const states = adaptiveStatesRef.current;
    if (states.size === 0) return;

    // Find the earliest point any scope reached, then go further back
    const oldestDates = Array.from(states.values()).map((s) =>
      s.oldestFetchedDate.getTime(),
    );
    const minOldest = new Date(Math.min(...oldestDates));
    const newStartDate = new Date(
      minOldest.getTime() - LOAD_MORE_DAYS * DAY_MS,
    );

    startFetch(
      scopesRef.current,
      new Date(), // default endDate (unused — each scope uses its saved state)
      newStartDate,
      states,
      true,
      false,
    );
  }, [isLoading, isFetchingNextPage, startFetch]);

  const optimisticUpdate = useCallback(
    (prId: string, changes: Partial<PullRequest>) => {
      setPrMap((prev) => {
        if (!prev.has(prId)) return prev;

        const next = new Map(prev);
        const current = next.get(prId)!;
        next.set(prId, { ...current, ...changes });

        return next;
      });
    },
    [],
  );

  const removePR = useCallback((prId: string) => {
    setPrMap((prev) => {
      if (!prev.has(prId)) return prev;
      const next = new Map(prev);
      next.delete(prId);
      return next;
    });
  }, []);

  const contextValue: PRContextType = {
    prMap,
    pageInfo,
    isLoading,
    isFetchingNextPage,
    searchQuery,
    setSearchQuery,
    setSearchScopes,
    loadNextPage,
    refresh,
    optimisticUpdate,
    removePR,
    error,
  };

  return (
    <PRContext.Provider value={contextValue}>{children}</PRContext.Provider>
  );
}
