import { Environment } from 'relay-runtime';
import { fetchQuery } from 'react-relay';
import { SearchPRsQuery } from '../queries/SearchPRsQuery';
import { SearchPRsQuery as SearchPRsQueryType } from '../queries/__generated__/SearchPRsQuery.graphql';
import { transformPR } from './prTransformer';
import { PullRequest } from '../types';
import { BATCH_SIZE } from '../constants';
import { type PageResult, type PageFetcher } from './AdaptiveScopeFetcher';
import {
  ABORT_SIGNAL_METADATA_KEY,
  createAbortError,
  isAbortError,
} from '../utils/abort';

function subscribeWithAbort<T>(
  observable: {
    subscribe: (observer: {
      next?: (value: T) => void;
      error?: (error: Error) => void;
      complete?: () => void;
    }) => { unsubscribe: () => void };
  },
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(createAbortError());
  }

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const subscription = observable.subscribe({
      next: (value) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(value);
      },
      error: (error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      },
      complete: () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('Query completed without data'));
      },
    });

    const onAbort = () => {
      if (settled) return;
      settled = true;
      subscription.unsubscribe();
      cleanup();
      reject(createAbortError());
    };

    const cleanup = () => {
      signal.removeEventListener('abort', onAbort);
    };

    signal.addEventListener('abort', onAbort, { once: true });
  });
}

async function fetchPage(
  environment: Environment,
  query: string,
  cursor: string | null,
  signal: AbortSignal,
): Promise<PageResult> {
  if (signal.aborted) {
    throw createAbortError();
  }

  try {
    const data = await subscribeWithAbort(
      fetchQuery<SearchPRsQueryType>(
        environment,
        SearchPRsQuery,
        { searchQuery: query, first: BATCH_SIZE, after: cursor },
        {
          fetchPolicy: 'network-only',
          networkCacheConfig: {
            force: true,
            metadata: { [ABORT_SIGNAL_METADATA_KEY]: signal },
          },
        },
      ),
      signal,
    );

    const prs = (data?.search?.edges || [])
      .map((edge) => transformPR(edge?.node))
      .filter((pr): pr is PullRequest => pr !== null);

    return {
      prs,
      issueCount: data?.search?.issueCount ?? 0,
      hasNextPage: data?.search?.pageInfo?.hasNextPage ?? false,
      endCursor: data?.search?.pageInfo?.endCursor ?? null,
    };
  } catch (err) {
    if (signal.aborted || isAbortError(err)) {
      throw createAbortError();
    }
    throw err;
  }
}

export function createPageFetcher(environment: Environment): PageFetcher {
  return (query, cursor, signal) =>
    fetchPage(environment, query, cursor, signal);
}
