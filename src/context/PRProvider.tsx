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
  type ScopeStream,
  type AdaptiveFetchState,
  INITIAL_INTERVAL_MS,
} from '../services/prFetchService';
import { createSerialQueue } from '../services/serialQueue';
import { pullStreamsUntilIdle } from '../services/prStorePull';
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
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [searchQuery, setSearchQueryState] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [oldestFetchedDate, setOldestFetchedDate] = useState<Date | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const scopesRef = useRef<string[]>([]);
  const scopeKeyRef = useRef('');
  const streamsRef = useRef<Map<string, ScopeStream>>(new Map());
  const enqueuePullRef = useRef(createSerialQueue());

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

  const pullAndIngest = useCallback((isLoadMore: boolean) => {
    return enqueuePullRef.current(async () => {
      const streams = streamsRef.current;
      if (streams.size === 0) {
        setIsLoading(false);
        setIsFetchingNextPage(false);
        setHasNextPage(false);
        return 0;
      }

      if (!isLoadMore) {
        setIsLoading(true);
      } else {
        setIsFetchingNextPage(true);
      }
      setError(null);

      let flipped = false;
      const result = await pullStreamsUntilIdle(streams, {
        onBatch: ingestBatch,
        onFirstPr: () => {
          if (!isLoadMore && !flipped) {
            flipped = true;
            setIsLoading(false);
            setIsFetchingNextPage(true);
          }
        },
      });

      setIsLoading(false);
      setIsFetchingNextPage(false);

      const currentStates = getCurrentStates();
      if (currentStates.size > 0) {
        const dates = Array.from(currentStates.values()).map((s) =>
          s.oldestFetchedDate.getTime(),
        );
        setOldestFetchedDate(new Date(Math.min(...dates)));
      }

      setHasNextPage(result.hasActiveStreams);

      if (result.errors.length > 0) {
        const scopeNames = result.errors.map((e) => e.scope).join(', ');
        setError(
          new Error(
            `Failed to fetch PRs for: ${scopeNames}. ${result.errors[0].error.message}`,
          ),
        );
      }

      return result.count;
    });
  }, []);

  const startStreams = useCallback(
    (scopes: string[], clearMap: boolean) => {
      abortAllStreams();

      if (scopes.length === 0) {
        setPrMap(new Map());
        setHasNextPage(false);
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

  const refresh = useCallback(() => {
    const scopes = scopesRef.current;
    if (scopes.length === 0) return;
    startStreams(scopes, false);
  }, [startStreams]);

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
    hasNextPage,
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
