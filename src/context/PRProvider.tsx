import {
  useState,
  useCallback,
  useRef,
  useEffect,
  startTransition,
  ReactNode,
} from 'react';
import { useRelayEnvironment } from 'react-relay';
import type { Environment } from 'relay-runtime';
import { PRContext } from './PRContext';
import { PRContextType, PullRequest } from '../types';
import { createPageFetcher } from '../services/prFetchService';
import {
  createPRFetchSession,
  createDefaultStreamFactory,
  scopesToSearchQuery,
  type PRFetchSession,
  type PRFetchSessionStatus,
} from '../services/prFetchSession';

interface PRProviderProps {
  children: ReactNode;
}

const INITIAL_STATUS: PRFetchSessionStatus = {
  isLoading: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  error: null,
  oldestFetchedDate: null,
};

export function PRProvider({ children }: PRProviderProps) {
  const environment = useRelayEnvironment();

  const [prMap, setPrMap] = useState<Map<string, PullRequest>>(new Map());
  const [searchQuery, setSearchQueryState] = useState('');
  const [status, setStatus] = useState<PRFetchSessionStatus>(INITIAL_STATUS);

  const sessionRef = useRef<PRFetchSession | null>(null);
  const environmentRef = useRef<Environment>(environment);

  const onBatch = useCallback((prs: PullRequest[]) => {
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
  }, []);

  const onBatchRef = useRef(onBatch);
  useEffect(() => {
    onBatchRef.current = onBatch;
  }, [onBatch]);

  const getSession = useCallback((): PRFetchSession => {
    if (environmentRef.current !== environment) {
      sessionRef.current?.dispose();
      sessionRef.current = null;
      environmentRef.current = environment;
    }

    if (!sessionRef.current) {
      sessionRef.current = createPRFetchSession({
        createStreams: createDefaultStreamFactory(
          createPageFetcher(environment),
        ),
        onBatch: (prs) => onBatchRef.current(prs),
        onStatus: setStatus,
      });
    }

    return sessionRef.current;
  }, [environment]);

  useEffect(() => {
    getSession();
    return () => {
      sessionRef.current?.dispose();
      sessionRef.current = null;
    };
  }, [getSession]);

  const setSearchScopes = useCallback(
    (scopes: string[]) => {
      const result = getSession().setScopes(scopes);
      if (result === 'noop') return;

      setSearchQueryState(scopesToSearchQuery(scopes));
      setPrMap(new Map());
    },
    [getSession],
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
    getSession().refresh();
  }, [getSession]);

  const loadNextPage = useCallback(() => {
    getSession().loadMore();
  }, [getSession]);

  const optimisticUpdate = useCallback(
    (prId: string, changes: Partial<PullRequest>) => {
      setPrMap((prev) => {
        const next = new Map(prev);
        const current = next.get(prId);
        if (current === undefined) return prev;

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
    hasNextPage: status.hasNextPage,
    isLoading: status.isLoading,
    isFetchingNextPage: status.isFetchingNextPage,
    searchQuery,
    setSearchQuery,
    setSearchScopes,
    loadNextPage,
    refresh,
    optimisticUpdate,
    removePR,
    error: status.error,
    oldestFetchedDate: status.oldestFetchedDate,
  };

  return (
    <PRContext.Provider value={contextValue}>{children}</PRContext.Provider>
  );
}
