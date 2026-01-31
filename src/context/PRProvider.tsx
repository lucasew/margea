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

  const [prMap, setPrMap] = useState<Map<string, PullRequest>>(new Map());
  const [pageInfo, setPageInfo] = useState<{ endCursor: string | null; hasNextPage: boolean }>({
    endCursor: null,
    hasNextPage: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [searchQuery, setSearchQueryState] = useState('');

  // Use a ref to prevent race conditions or duplicate fetches if needed,
  // but for now state should suffice.

  const updatePRs = useCallback((newPRs: PullRequest[], append: boolean) => {
    setPrMap((prev) => {
      // If not appending (i.e. full refresh), start with new map.
      // However, to avoid UI flashing, maybe we want to keep existing?
      // Usually "Search Query Changed" => Clear.
      // "Refresh" => Update.
      // For now, if !append, we clear.
      const next = append ? new Map(prev) : new Map();

      newPRs.forEach((pr) => {
        next.set(pr.url, pr);
      });

      return next;
    });
  }, []);

  const fetchPRs = useCallback(async (query: string, cursor: string | null, isNextPage: boolean) => {
    if (!query) return;

    if (isNextPage) {
      setIsFetchingNextPage(true);
    } else {
      setIsLoading(true);
    }

    try {
      const data = await fetchQuery<SearchPRsQueryType>(
        environment,
        SearchPRsQuery,
        {
          searchQuery: query,
          first: BATCH_SIZE, // Use constant from constants.ts
          after: cursor,
        }
      ).toPromise();

      if (data?.search) {
        const newPRs = (data.search.edges || [])
          .map((edge) => transformPR(edge?.node))
          .filter((pr): pr is PullRequest => pr !== null);

        updatePRs(newPRs, isNextPage);

        setPageInfo({
          hasNextPage: data.search.pageInfo?.hasNextPage ?? false,
          endCursor: data.search.pageInfo?.endCursor ?? null,
        });
      }
    } catch (error) {
      console.error('Error fetching PRs:', error);
      // TODO: Handle error state in context if needed
    } finally {
      if (isNextPage) {
        setIsFetchingNextPage(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [environment, updatePRs]);

  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);
    // Reset and fetch immediately
    setPageInfo({ endCursor: null, hasNextPage: false });
    // We pass null cursor to start over
    fetchPRs(query, null, false);
  }, [fetchPRs]);

  const refresh = useCallback(() => {
    // Refresh with current query, start from beginning
    // Note: This replaces the list. If we want to "Soft Refresh" (update visible),
    // we would need different logic. For now, full refresh is safer.
    if (searchQuery) {
        // Reset cursor to null to fetch first page again
        // But do we want to clear the list?
        // If we want to keep current list while loading, we should handle that in updatePRs.
        // For simplicity:
        fetchPRs(searchQuery, null, false);
    }
  }, [searchQuery, fetchPRs]);

  const loadNextPage = useCallback(() => {
    if (!isLoading && !isFetchingNextPage && pageInfo.hasNextPage && pageInfo.endCursor && searchQuery) {
      fetchPRs(searchQuery, pageInfo.endCursor, true);
    }
  }, [isLoading, isFetchingNextPage, pageInfo, searchQuery, fetchPRs]);

  const optimisticUpdate = useCallback((prId: string, changes: Partial<PullRequest>) => {
    setPrMap((prev) => {
      // Find PR by ID? Map is keyed by URL.
      // This is inefficient if we only have ID.
      // But we can iterate.
      // Or we should pass URL?
      // Usually operations happen on a PR object which has URL.
      // Let's assume we can find it.
      // Most of our operations know the PR object.

      // If changes includes URL (unlikely), handle carefully.

      const next = new Map(prev);
      let targetUrl: string | undefined;

      // Fast lookup if we knew the URL, but here we search by ID if URL not provided?
      // For now let's iterate to find by ID if we must.
      for (const [url, pr] of next.entries()) {
        if (pr.id === prId) {
          targetUrl = url;
          break;
        }
      }

      if (targetUrl) {
        const current = next.get(targetUrl)!;
        next.set(targetUrl, { ...current, ...changes });
      }

      return next;
    });
  }, []);

  const removePR = useCallback((prUrl: string) => {
    setPrMap((prev) => {
        if (!prev.has(prUrl)) return prev;
        const next = new Map(prev);
        next.delete(prUrl);
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
  };

  return (
    <PRContext.Provider value={contextValue}>
      {children}
    </PRContext.Provider>
  );
}
