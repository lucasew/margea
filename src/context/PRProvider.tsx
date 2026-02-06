import { useState, useCallback, useRef, ReactNode } from 'react';
import { useRelayEnvironment } from 'react-relay';
import { PRContext } from './PRContext';
import { PRContextType, PullRequest } from '../types';
import { fetchScopes, ScopeProgress } from '../services/prFetchService';

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

  // Track active scopes and their abort controller
  const abortRef = useRef<AbortController | null>(null);
  const scopesRef = useRef<string[]>([]);
  const scopeProgressRef = useRef<Map<string, ScopeProgress>>(new Map());

  const mergePRBatch = useCallback((newPRs: PullRequest[]) => {
    setPrMap((prev) => {
      const next = new Map(prev);
      newPRs.forEach((pr) => next.set(pr.id, pr));
      return next;
    });
  }, []);

  /**
   * Primary fetch method: fetches PRs for multiple scopes in parallel.
   * Each scope gets its own 1000-result window and auto-paginates.
   */
  const setSearchScopes = useCallback(
    (scopes: string[]) => {
      // Cancel any in-flight fetch
      if (abortRef.current) {
        abortRef.current.abort();
      }

      scopesRef.current = scopes;
      scopeProgressRef.current = new Map();

      // Build a synthetic searchQuery for display/compat
      const syntheticQuery =
        scopes.length > 0 ? `is:pr ${scopes.join(' or ')}` : '';
      setSearchQueryState(syntheticQuery);

      if (scopes.length === 0) {
        setPrMap(new Map());
        setPageInfo({ endCursor: null, hasNextPage: false });
        return;
      }

      // Reset state for a fresh fetch
      setPrMap(new Map());
      setIsLoading(true);
      setIsFetchingNextPage(false);
      setError(null);
      setPageInfo({ endCursor: null, hasNextPage: true });

      const controller = fetchScopes(environment, scopes, {
        onBatch: (prs) => {
          mergePRBatch(prs);
        },

        onScopeProgress: (progress) => {
          scopeProgressRef.current.set(progress.scope, progress);

          // Aggregate: hasNextPage if any scope is not done
          const allDone = Array.from(scopeProgressRef.current.values()).every(
            (p) => p.done,
          );
          // Only update hasNextPage — keep endCursor null (not used in scope mode)
          if (allDone) {
            setPageInfo({ endCursor: null, hasNextPage: false });
            setIsFetchingNextPage(false);
          } else {
            // If at least one scope has delivered data, switch from initial loading
            // to "fetching next page" so the UI shows incremental progress.
            const anyFetched = Array.from(
              scopeProgressRef.current.values(),
            ).some((p) => p.fetched > 0);
            if (anyFetched) {
              setIsLoading(false);
              setIsFetchingNextPage(true);
            }
          }
        },

        onComplete: (results) => {
          setIsLoading(false);
          setIsFetchingNextPage(false);
          setPageInfo({ endCursor: null, hasNextPage: false });

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
      });

      abortRef.current = controller;
    },
    [environment, mergePRBatch],
  );

  /**
   * Convenience wrapper: accepts a single search query string.
   * For backward compatibility with code that passes a pre-built query.
   * This runs a single-scope fetch (no parallelism benefit).
   */
  const setSearchQuery = useCallback(
    (query: string) => {
      // Extract just the scope from "is:pr <scope>" if present
      const scope = query.replace(/^is:pr\s+/, '');
      if (scope) {
        setSearchScopes([scope]);
      }
    },
    [setSearchScopes],
  );

  /**
   * Refresh: re-fetch all current scopes from scratch.
   */
  const refresh = useCallback(() => {
    if (scopesRef.current.length > 0) {
      setSearchScopes([...scopesRef.current]);
    }
  }, [setSearchScopes]);

  /**
   * loadNextPage is a no-op in scope mode (auto-pagination handles it).
   * Kept for interface compatibility with PRList's infinite scroll sentinel.
   */
  const loadNextPage = useCallback(() => {
    // Auto-pagination handles all pages. This is intentionally a no-op.
  }, []);

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
