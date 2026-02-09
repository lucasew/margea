import { Environment } from 'relay-runtime';
import { fetchQuery } from 'react-relay';
import { SearchPRsQuery } from '../queries/SearchPRsQuery';
import { SearchPRsQuery as SearchPRsQueryType } from '../queries/__generated__/SearchPRsQuery.graphql';
import { transformPR } from './prTransformer';
import { PullRequest } from '../types';
import { BATCH_SIZE } from '../constants';
import {
  AdaptiveScopeFetcher,
  INITIAL_INTERVAL_MS,
  type ScopeProgress,
  type AdaptiveFetchState,
  type PageResult,
} from './AdaptiveScopeFetcher';

export type { ScopeProgress, AdaptiveFetchState };

async function fetchPage(
  environment: Environment,
  query: string,
  cursor: string | null,
): Promise<PageResult> {
  const data = await fetchQuery<SearchPRsQueryType>(
    environment,
    SearchPRsQuery,
    { searchQuery: query, first: BATCH_SIZE, after: cursor },
    { fetchPolicy: 'network-only' },
  ).toPromise();

  const prs = (data?.search?.edges || [])
    .map((edge) => transformPR(edge?.node))
    .filter((pr): pr is PullRequest => pr !== null);

  return {
    prs,
    issueCount: data?.search?.issueCount ?? 0,
    hasNextPage: data?.search?.pageInfo?.hasNextPage ?? false,
    endCursor: data?.search?.pageInfo?.endCursor ?? null,
  };
}

export interface FetchScopesCallbacks {
  onBatch: (prs: PullRequest[]) => void;
  onScopeProgress: (progress: ScopeProgress) => void;
  onComplete: (
    results: ScopeProgress[],
    states: Map<string, AdaptiveFetchState>,
  ) => void;
}

/**
 * Fetches PRs for multiple scopes in parallel with adaptive time windows.
 *
 * Each scope runs independently with its own adaptive interval.
 * When `initialStates` is provided (load-more), each scope resumes
 * from its saved `oldestFetchedDate` with its tuned interval.
 */
export function fetchScopes(
  environment: Environment,
  scopes: string[],
  endDate: Date,
  startDate: Date,
  initialStates: Map<string, AdaptiveFetchState> | null,
  callbacks: FetchScopesCallbacks,
): AbortController {
  const controller = new AbortController();

  const run = async () => {
    const results = await Promise.allSettled(
      scopes.map((scope) => {
        const saved = initialStates?.get(scope);
        const fetcher = new AdaptiveScopeFetcher(
          scope,
          (query, cursor) => fetchPage(environment, query, cursor),
          callbacks.onBatch,
          callbacks.onScopeProgress,
        );

        return fetcher.fetch(
          saved ? saved.oldestFetchedDate : endDate,
          startDate,
          saved ? saved.intervalMs : INITIAL_INTERVAL_MS,
          controller.signal,
        );
      }),
    );

    const states = new Map<string, AdaptiveFetchState>();
    const finalProgress = results.map((result, i) => {
      if (result.status === 'fulfilled') {
        states.set(scopes[i], result.value.state);
        return result.value.progress;
      }
      return {
        scope: scopes[i],
        fetched: 0,
        done: true,
        error:
          result.reason instanceof Error
            ? result.reason
            : new Error('Scope fetch failed'),
      };
    });

    callbacks.onComplete(finalProgress, states);
  };

  run();

  return controller;
}
