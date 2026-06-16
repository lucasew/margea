import { useState, useCallback, useRef, ReactNode } from 'react';
import { useRelayEnvironment } from 'react-relay';
import { PRContext } from './PRContext';
import { PRContextType, PullRequest } from '../types';
import {
  createScopeStream,
  createPageFetcher,
  type ScopeStream,
  type AdaptiveFetchState,
  INITIAL_INTERVAL_MS,
} from '../services/prFetchService';
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
  const [oldestFetchedDate, setOldestFetchedDate] = useState<Date | null>(null);

  // Active search scopes + the live generators/streams we pull from.
  // The store drives everything by creating streams and pulling PRs out of them.
  const abortRef = useRef<AbortController | null>(null);
  const scopesRef = useRef<string[]>([]);
  const scopeKeyRef = useRef('');
  const streamsRef = useRef<Map<string, ScopeStream>>(new Map());

  function getCurrentStates(): Map<string, AdaptiveFetchState> {
    const out = new Map<string, AdaptiveFetchState>();
    streamsRef.current.forEach((strm, scope) => {
      out.set(scope, strm.getState());
    });
    return out;
  }

  function abortAllStreams() {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    streamsRef.current.forEach((s) => s.abort());
    streamsRef.current.clear();
  }

  /**
   * Pulls PRs from all active generators (store pulls from generators)
   * and ingests them directly into the store as they are yielded.
   * This is the only way data enters prMap for the fetcher system.
   */
  const pullAndIngest = useCallback(
    async (isLoadMore: boolean) => {
      const entries = Array.from(streamsRef.current.entries());
      if (entries.length === 0) {
        setIsLoading(false);
        setIsFetchingNextPage(false);
        return 0;
      }

      if (!isLoadMore) {
        setIsLoading(true);
      } else {
        setIsFetchingNextPage(true);
      }
      setError(null);

      const phase = { count: 0 };
      let flipped = false;
      const errors: { scope: string; error: Error }[] = [];

      const drainers = entries.map(async ([scope, strm]) => {
        let local = 0;
        try {
          while (true) {
            const { value, done } = await strm.generator.next();
            if (done) break;
            if (value) {
              setPrMap((prev) => {
                const next = new Map(prev);
                next.set(value.id, value);
                return next;
              });
              local++;
              phase.count++;

              if (!isLoadMore && !flipped) {
                flipped = true;
                setIsLoading(false);
                setIsFetchingNextPage(true);
              }
            }
          }
        } catch (e) {
          // Per-scope failure. Other scopes keep being pulled.
          const err = e instanceof Error ? e : new Error(String(e));
          errors.push({ scope, error: err });
        }
        return local;
      });

      await Promise.allSettled(drainers);

      setIsLoading(false);
      setIsFetchingNextPage(false);

      const currentStates = getCurrentStates();
      if (currentStates.size > 0) {
        const dates = Array.from(currentStates.values()).map((s) => s.oldestFetchedDate.getTime());
        setOldestFetchedDate(new Date(Math.min(...dates)));
      }

      if (isLoadMore) {
        const hasMore = phase.count > 0;
        setPageInfo({ endCursor: null, hasNextPage: hasMore });
      } else {
        setPageInfo({ endCursor: null, hasNextPage: streamsRef.current.size > 0 });
      }

      if (errors.length > 0) {
        const scopeNames = errors.map((e) => e.scope).join(', ');
        setError(
          new Error(
            `Failed to fetch PRs for: ${scopeNames}. ${errors[0].error.message}`,
          ),
        );
      }

      return phase.count;
    },
    [],
  );

  /**
   * Primary entry point: create one generator-backed ScopeStream per scope.
   * The store will immediately pull all PRs the generators produce for the
   * initial target window. PRs are yielded by the generator as pages arrive.
   */
  const setSearchScopes = useCallback(
    (scopes: string[]) => {
      const newKey = scopes.slice().sort().join('\n');
      if (newKey === scopeKeyRef.current) return;
      scopeKeyRef.current = newKey;

      scopesRef.current = scopes;

      const syntheticQuery =
        scopes.length > 0 ? `is:pr ${scopes.join(' or ')}` : '';
      setSearchQueryState(syntheticQuery);

      abortAllStreams();

      if (scopes.length === 0) {
        setPrMap(new Map());
        setPageInfo({ endCursor: null, hasNextPage: false });
        setOldestFetchedDate(null);
        return;
      }

      setPrMap(new Map());
      setError(null);
      setOldestFetchedDate(null);

      const now = new Date();
      const initialStart = new Date(
        now.getTime() - INITIAL_FETCH_DAYS * DAY_MS,
      );

      const master = new AbortController();
      abortRef.current = master;

      const pageFetcher = createPageFetcher(environment);

      scopes.forEach((scope) => {
        const stream = createScopeStream(
          scope,
          pageFetcher,
          now,
          initialStart,
          INITIAL_INTERVAL_MS,
          master.signal,
        );
        streamsRef.current.set(scope, stream);
      });

      // The store pulls from the generators. This drives ingestion.
      pullAndIngest(false);
    },
    [environment, pullAndIngest],
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
   * Refresh: recreate streams for the *recent* window only (last N days)
   * and pull from them. Existing deep history PRs (from prior load-more)
   * stay in the map; only the recent slice is re-ingested (merge by id).
   */
  const refresh = useCallback(() => {
    const scopes = scopesRef.current;
    if (scopes.length === 0) return;

    abortAllStreams();
    setError(null);
    setOldestFetchedDate(null);

    const now = new Date();
    const initialStart = new Date(
      now.getTime() - INITIAL_FETCH_DAYS * DAY_MS,
    );

    const master = new AbortController();
    abortRef.current = master;

    const pageFetcher = createPageFetcher(environment);

    scopes.forEach((scope) => {
      const stream = createScopeStream(
        scope,
        pageFetcher,
        now,
        initialStart,
        INITIAL_INTERVAL_MS,
        master.signal,
      );
      streamsRef.current.set(scope, stream);
    });

    pullAndIngest(false);
  }, [environment, pullAndIngest]);

  /**
   * Load more / "keep looking": tell every live generator to extend its
   * internal target further into the past, then the store pulls more PRs
   * out of the same generators. This is the "consume more from the generator"
   * operation.
   */
  const loadNextPage = useCallback(() => {
    if (
      isLoading ||
      isFetchingNextPage ||
      streamsRef.current.size === 0
    ) {
      return;
    }

    const states = getCurrentStates();
    if (states.size === 0) return;

    const oldestDates = Array.from(states.values()).map((s) =>
      s.oldestFetchedDate.getTime(),
    );
    const minOldest = new Date(Math.min(...oldestDates));
    const newTargetStart = new Date(
      minOldest.getTime() - LOAD_MORE_DAYS * DAY_MS,
    );

    // Tell the generators (the source of truth) they can now go further back.
    streamsRef.current.forEach((strm) => strm.extendTarget(newTargetStart));

    // Store pulls more from the (now extended) generators.
    pullAndIngest(true);
  }, [isLoading, isFetchingNextPage, pullAndIngest]);

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
    oldestFetchedDate,
  };

  return (
    <PRContext.Provider value={contextValue}>{children}</PRContext.Provider>
  );
}
