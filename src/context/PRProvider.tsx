import { useState, useCallback, ReactNode } from 'react';
import { fetchQuery, useRelayEnvironment } from 'react-relay';
import { PRContext } from './PRContext';
import { PRContextType, PullRequest } from '../types';
import { SearchPRsQuery } from '../queries/SearchPRsQuery';
import { SearchPRsQuery as SearchPRsQueryType } from '../queries/__generated__/SearchPRsQuery.graphql';
import { transformPR } from '../services/prTransformer';
import { BATCH_SIZE } from '../constants';

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

  const updatePRs = useCallback((newPRs: PullRequest[], append: boolean) => {
    setPrMap((prev) => {
      // If not appending (i.e. full refresh), start with new map.
      const next = append ? new Map(prev) : new Map();

      newPRs.forEach((pr) => {
        next.set(pr.id, pr); // Use ID as key
      });

      return next;
    });
  }, []);

  const fetchPRs = useCallback(
    async (query: string, cursor: string | null, isNextPage: boolean) => {
      if (!query) return;

      if (isNextPage) {
        setIsFetchingNextPage(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const data = await fetchQuery<SearchPRsQueryType>(
          environment,
          SearchPRsQuery,
          {
            searchQuery: query,
            first: BATCH_SIZE,
            after: cursor,
          },
        ).toPromise();

        if (data?.search) {
          const newPRs = (data.search.edges || [])
            .map((edge) => transformPR(edge?.node))
            .filter((pr): pr is PullRequest => pr !== null);

          if (newPRs.length === 0) {
            console.warn(`Search returned 0 PRs. Query: "${query}"`, data);
          }

          updatePRs(newPRs, isNextPage);

          setPageInfo({
            hasNextPage: data.search.pageInfo?.hasNextPage ?? false,
            endCursor: data.search.pageInfo?.endCursor ?? null,
          });
        }
      } catch (err: any) {
        console.error('Error fetching PRs:', err);
        // Capture error for display
        setError(
          err instanceof Error ? err : new Error('Unknown error occurred'),
        );
      } finally {
        if (isNextPage) {
          setIsFetchingNextPage(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [environment, updatePRs],
  );

  const setSearchQuery = useCallback(
    (query: string) => {
      setSearchQueryState(query);
      setPageInfo({ endCursor: null, hasNextPage: false });
      fetchPRs(query, null, false);
    },
    [fetchPRs],
  );

  const refresh = useCallback(() => {
    if (searchQuery) {
      fetchPRs(searchQuery, null, false);
    }
  }, [searchQuery, fetchPRs]);

  const loadNextPage = useCallback(() => {
    if (
      !isLoading &&
      !isFetchingNextPage &&
      pageInfo.hasNextPage &&
      pageInfo.endCursor &&
      searchQuery
    ) {
      fetchPRs(searchQuery, pageInfo.endCursor, true);
    }
  }, [isLoading, isFetchingNextPage, pageInfo, searchQuery, fetchPRs]);

  const optimisticUpdate = useCallback(
    (prId: string, changes: Partial<PullRequest>) => {
      setPrMap((prev) => {
        // O(1) Lookup by ID
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
