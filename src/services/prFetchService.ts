import { Environment } from 'relay-runtime';
import { fetchQuery } from 'react-relay';
import { SearchPRsQuery } from '../queries/SearchPRsQuery';
import { SearchPRsQuery as SearchPRsQueryType } from '../queries/__generated__/SearchPRsQuery.graphql';
import { transformPR } from './prTransformer';
import { PullRequest } from '../types';
import { BATCH_SIZE } from '../constants';

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_INTERVAL_MS = DAY_MS;
const MAX_INTERVAL_MS = 30 * DAY_MS;
const INITIAL_INTERVAL_MS = DAY_MS;
const WIDEN_THRESHOLD = 200;
const NARROW_THRESHOLD = 500;
const GITHUB_SEARCH_LIMIT = 1000;

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export interface ScopeProgress {
  scope: string;
  fetched: number;
  done: boolean;
  error: Error | null;
}

/**
 * Per-scope adaptive state, saved between "load more" calls so each
 * scope resumes from where it stopped with its tuned interval.
 */
export interface AdaptiveFetchState {
  oldestFetchedDate: Date;
  intervalMs: number;
}

interface PageResult {
  prs: PullRequest[];
  issueCount: number;
  hasNextPage: boolean;
  endCursor: string | null;
}

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

/**
 * Fetches PRs for a single scope using adaptive time windows.
 *
 * Starts with 1-day windows and adjusts based on density:
 * - issueCount < 200: double the window for next iteration (sparse)
 * - issueCount > 500: halve the window for next iteration (dense)
 * - issueCount > 1000: must halve and retry (would truncate)
 */
async function fetchScopeAdaptive(
  environment: Environment,
  scope: string,
  endDate: Date,
  startDate: Date,
  initialIntervalMs: number,
  signal: AbortSignal,
  onBatch: (prs: PullRequest[]) => void,
  onProgress: (progress: ScopeProgress) => void,
): Promise<{ progress: ScopeProgress; state: AdaptiveFetchState }> {
  const baseQuery = `is:pr ${scope}`;
  let intervalMs = initialIntervalMs;
  let windowEnd = endDate;
  let totalFetched = 0;

  const progress: ScopeProgress = {
    scope,
    fetched: 0,
    done: false,
    error: null,
  };

  try {
    while (windowEnd > startDate && !signal.aborted) {
      const windowStart = new Date(
        Math.max(windowEnd.getTime() - intervalMs, startDate.getTime()),
      );

      const dateFilter = `created:${formatDate(windowStart)}..${formatDate(windowEnd)}`;
      const query = `${baseQuery} ${dateFilter}`;

      // Probe: fetch first page to check issueCount before full pagination
      const firstPage = await fetchPage(environment, query, null);
      if (signal.aborted) break;

      // If issueCount exceeds GitHub's hard cap, split the window
      if (
        firstPage.issueCount > GITHUB_SEARCH_LIMIT &&
        intervalMs > MIN_INTERVAL_MS
      ) {
        intervalMs = Math.max(Math.floor(intervalMs / 2), MIN_INTERVAL_MS);
        continue; // Retry this window with smaller interval
      }

      // Process probe results
      if (firstPage.prs.length > 0) {
        totalFetched += firstPage.prs.length;
        onBatch(firstPage.prs);
      }

      // Paginate remaining pages in this window
      let cursor = firstPage.endCursor;
      let hasNext = firstPage.hasNextPage;
      while (hasNext && !signal.aborted) {
        const page = await fetchPage(environment, query, cursor);
        if (page.prs.length > 0) {
          totalFetched += page.prs.length;
          onBatch(page.prs);
        }
        hasNext = page.hasNextPage;
        cursor = page.endCursor;
      }

      progress.fetched = totalFetched;
      onProgress({ ...progress });

      // Adapt interval for next window based on density
      if (firstPage.issueCount > NARROW_THRESHOLD) {
        intervalMs = Math.max(Math.floor(intervalMs / 2), MIN_INTERVAL_MS);
      } else if (firstPage.issueCount < WIDEN_THRESHOLD) {
        intervalMs = Math.min(intervalMs * 2, MAX_INTERVAL_MS);
      }

      // Advance to next window
      windowEnd = windowStart;
    }

    progress.done = true;
    onProgress({ ...progress });

    return {
      progress,
      state: { oldestFetchedDate: windowEnd, intervalMs },
    };
  } catch (err) {
    progress.error =
      err instanceof Error ? err : new Error('Unknown error in scope fetch');
    progress.done = true;
    onProgress({ ...progress });

    return {
      progress,
      state: { oldestFetchedDate: windowEnd, intervalMs },
    };
  }
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
        return fetchScopeAdaptive(
          environment,
          scope,
          saved ? saved.oldestFetchedDate : endDate,
          startDate,
          saved ? saved.intervalMs : INITIAL_INTERVAL_MS,
          controller.signal,
          callbacks.onBatch,
          callbacks.onScopeProgress,
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
