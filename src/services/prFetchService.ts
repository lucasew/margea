import { Environment } from 'relay-runtime';
import { fetchQuery } from 'react-relay';
import { SearchPRsQuery } from '../queries/SearchPRsQuery';
import { SearchPRsQuery as SearchPRsQueryType } from '../queries/__generated__/SearchPRsQuery.graphql';
import { transformPR } from './prTransformer';
import { PullRequest } from '../types';
import { BATCH_SIZE } from '../constants';

export interface ScopeProgress {
  scope: string;
  fetched: number;
  done: boolean;
  error: Error | null;
}

export interface FetchScopesCallbacks {
  /** Called incrementally as PRs are fetched for any scope. */
  onBatch: (prs: PullRequest[]) => void;
  /** Called when a scope's progress changes. */
  onScopeProgress: (progress: ScopeProgress) => void;
  /** Called when all scopes finish (success or failure). */
  onComplete: (results: ScopeProgress[]) => void;
}

/**
 * Fetches all pages for a single search scope (e.g. "is:pr org:my-org").
 * Auto-paginates until there are no more pages.
 */
async function fetchScope(
  environment: Environment,
  scope: string,
  onBatch: (prs: PullRequest[]) => void,
  onProgress: (progress: ScopeProgress) => void,
  signal: AbortSignal,
): Promise<ScopeProgress> {
  const query = `is:pr ${scope}`;
  let cursor: string | null = null;
  let hasNextPage = true;
  let totalFetched = 0;

  const progress: ScopeProgress = {
    scope,
    fetched: 0,
    done: false,
    error: null,
  };

  try {
    while (hasNextPage && !signal.aborted) {
      const data = await fetchQuery<SearchPRsQueryType>(
        environment,
        SearchPRsQuery,
        {
          searchQuery: query,
          first: BATCH_SIZE,
          after: cursor,
        },
        { fetchPolicy: 'network-only' },
      ).toPromise();

      if (signal.aborted) break;

      if (!data?.search) break;

      const newPRs = (data.search.edges || [])
        .map((edge) => transformPR(edge?.node))
        .filter((pr): pr is PullRequest => pr !== null);

      if (newPRs.length > 0) {
        totalFetched += newPRs.length;
        onBatch(newPRs);
      }

      progress.fetched = totalFetched;
      onProgress({ ...progress });

      hasNextPage = data.search.pageInfo?.hasNextPage ?? false;
      cursor = data.search.pageInfo?.endCursor ?? null;
    }

    progress.done = true;
    onProgress({ ...progress });
    return progress;
  } catch (err) {
    progress.error =
      err instanceof Error ? err : new Error('Unknown error in scope fetch');
    progress.done = true;
    onProgress({ ...progress });
    return progress;
  }
}

/**
 * Fetches PRs for multiple scopes in parallel with auto-pagination.
 *
 * Each scope (e.g. "org:my-org", "user:my-login") becomes an independent
 * `is:pr <scope>` search query. Each gets its own 1000-result window from
 * GitHub's search API, effectively multiplying the cap by the number of scopes.
 *
 * Results are streamed incrementally via `onBatch` as they arrive.
 *
 * @returns An AbortController that can be used to cancel all in-flight fetches.
 */
export function fetchScopes(
  environment: Environment,
  scopes: string[],
  callbacks: FetchScopesCallbacks,
): AbortController {
  const controller = new AbortController();

  const run = async () => {
    const results = await Promise.allSettled(
      scopes.map((scope) =>
        fetchScope(
          environment,
          scope,
          callbacks.onBatch,
          callbacks.onScopeProgress,
          controller.signal,
        ),
      ),
    );

    const finalProgress = results.map((result, i) => {
      if (result.status === 'fulfilled') return result.value;
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

    callbacks.onComplete(finalProgress);
  };

  run();

  return controller;
}
