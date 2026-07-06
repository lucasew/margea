import {
  useState,
  useCallback,
  useRef,
  startTransition,
  ReactNode,
} from 'react';
import { useRelayEnvironment } from 'react-relay';
import { Environment } from 'relay-runtime';
import { PRContext } from './PRContext';
import { PRContextType, PullRequest } from '../types';
import {
  createScopeStream,
  createPageFetcher,
  SCOPE_STREAM_IDLE,
  type ScopeStream,
  type AdaptiveFetchState,
  INITIAL_INTERVAL_MS,
} from '../services/prFetchService';
import { INITIAL_FETCH_DAYS, LOAD_MORE_DAYS } from '../constants';

const DAY_MS = 24 * 60 * 60 * 1000;

interface PRProviderProps {
  children: ReactNode;
}

function createStreamsForScopes(
  scopes: string[],
  environment: Environment,
  signal: AbortSignal,
): Map<string, ScopeStream> {
  const pageFetcher = createPageFetcher(environment);
  const now = new Date();
  const initialStart = new Date(now.getTime() - INITIAL_FETCH_DAYS * DAY_MS);
  const streams = new Map<string, ScopeStream>();

  for (const scope of scopes) {
    streams.set(
      scope,
      createScopeStream(
        scope,
        pageFetcher,
        now,
        initialStart,
        INITIAL_INTERVAL_MS,
        signal,
      ),
    );
  }

  return streams;
}

export function PRProvider({ children }: PRProviderProps) {
  const environment = useRelayEnvironment();

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

  const abortRef = useRef<AbortController | null>(null);
  const scopesRef = useRef<string[]>([]);
  const scopeKeyRef = useRef('');
  const streamsRef = useRef<Map<string, ScopeStream>>(new Map());
  const pullChainRef = useRef<Promise<number>>(Promise.resolve(0));

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

  function ingestBatch(prs: PullRequest[]) {
    if (prs.length === 0) return;
    startTransition(() => {
      setPrMap((prev) => {
        const next = new Map(prev);
        for (const pr of prs) {
          next.set(pr.id, pr);
        }
        return next;
      });
    });
  }

  /**
   * Pulls PRs from all active generators until each reports idle (caught up to
   * its current target). Serialized so two callers never interleave .next().
   */
  const pullAndIngest = useCallback((isLoadMore: boolean) => {
    const run = async (): Promise<number> => {
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
        const batch: PullRequest[] = [];
        try {
          while (true) {
            const { value, done } = await strm.generator.next();
            if (done) break;
            if (value === SCOPE_STREAM_IDLE) {
              ingestBatch(batch);
              batch.length = 0;
              break;
            }
            if (value) {
              batch.push(value);
              local++;
              phase.count++;

              if (batch.length >= 20) {
                ingestBatch(batch);
                batch.length = 0;
              }

              if (!isLoadMore && !flipped) {
                flipped = true;
                setIsLoading(false);
                setIsFetchingNextPage(true);
              }
            }
          }
          ingestBatch(batch);
        } catch (e) {
          ingestBatch(batch);
          const err = e instanceof Error ? e : new Error(String(e));
          if (err.name !== 'AbortError') {
            errors.push({ scope, error: err });
          }
        }
        return local;
      });

      await Promise.allSettled(drainers);

      setIsLoading(false);
      setIsFetchingNextPage(false);

      const currentStates = getCurrentStates();
      if (currentStates.size > 0) {
        const dates = Array.from(currentStates.values()).map((s) =>
          s.oldestFetchedDate.getTime(),
        );
        setOldestFetchedDate(new Date(Math.min(...dates)));
      }

      const hasActiveStreams = streamsRef.current.size > 0;
      if (isLoadMore) {
        const hasMore = phase.count > 0 || hasActiveStreams;
        setPageInfo({ endCursor: null, hasNextPage: hasMore });
      } else {
        setPageInfo({
          endCursor: null,
          hasNextPage: hasActiveStreams,
        });
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
    };

    const queued = pullChainRef.current.then(run, run);
    pullChainRef.current = queued.then(
      () => 0,
      () => 0,
    );
    return queued;
  }, []);

  const startStreams = useCallback(
    (scopes: string[], clearMap: boolean) => {
      abortAllStreams();

      if (scopes.length === 0) {
        setPrMap(new Map());
        setPageInfo({ endCursor: null, hasNextPage: false });
        setOldestFetchedDate(null);
        setError(null);
        return;
      }

      if (clearMap) {
        setPrMap(new Map());
      }
      setError(null);
      setOldestFetchedDate(null);

      const master = new AbortController();
      abortRef.current = master;
      streamsRef.current = createStreamsForScopes(
        scopes,
        environment,
        master.signal,
      );

      pullAndIngest(false);
    },
    [environment, pullAndIngest],
  );

  const setSearchScopes = useCallback(
    (scopes: string[]) => {
      const newKey = scopes.slice().sort().join('\n');
      if (newKey === scopeKeyRef.current) return;
      scopeKeyRef.current = newKey;
      scopesRef.current = scopes;

      const syntheticQuery =
        scopes.length > 0 ? `is:pr ${scopes.join(' or ')}` : '';
      setSearchQueryState(syntheticQuery);

      startStreams(scopes, true);
    },
    [startStreams],
  );

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
   * Refresh: recreate streams for the recent window only. Existing deep-history
   * PRs stay in the map; recent rows are re-ingested (merge by id).
   */
  const refresh = useCallback(() => {
    const scopes = scopesRef.current;
    if (scopes.length === 0) return;
    startStreams(scopes, false);
  }, [startStreams]);

  /**
   * Extend every live generator further into the past, then pull until idle.
   */
  const loadNextPage = useCallback(() => {
    if (isLoading || isFetchingNextPage || streamsRef.current.size === 0) {
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

    streamsRef.current.forEach((strm) => strm.extendTarget(newTargetStart));
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
