import { PullRequest } from '../types';
import { DAY_MS } from '../constants';
import { isAbortError } from '../utils/abort';

const MIN_INTERVAL_MS = DAY_MS;
const MAX_INTERVAL_MS = 30 * DAY_MS;
const WIDEN_THRESHOLD = 200;
const NARROW_THRESHOLD = 500;
const GITHUB_SEARCH_LIMIT = 1000;

export const INITIAL_INTERVAL_MS = DAY_MS;

/** Yielded when a scope stream has caught up to its current targetStart. */
export const SCOPE_STREAM_IDLE = Symbol('SCOPE_STREAM_IDLE');
export type ScopeStreamIdle = typeof SCOPE_STREAM_IDLE;
export type ScopeStreamYield = PullRequest | ScopeStreamIdle;

function formatDate(date: Date): string {
  return [
    date.getUTCFullYear(),
    (date.getUTCMonth() + 1).toString().padStart(2, '0'),
    date.getUTCDate().toString().padStart(2, '0'),
  ].join('-');
}

export interface AdaptiveFetchState {
  oldestFetchedDate: Date;
  intervalMs: number;
}

export interface PageResult {
  prs: PullRequest[];
  issueCount: number;
  hasNextPage: boolean;
  endCursor: string | null;
}

export type PageFetcher = (
  query: string,
  cursor: string | null,
  signal: AbortSignal,
) => Promise<PageResult>;

export interface ScopeStream {
  generator: AsyncGenerator<ScopeStreamYield>;
  getState: () => AdaptiveFetchState;
  extendTarget: (newStartDate: Date) => void;
  abort: () => void;
}

function adaptInterval(intervalMs: number, issueCount: number): number {
  if (issueCount > NARROW_THRESHOLD) {
    return Math.max(Math.floor(intervalMs / 2), MIN_INTERVAL_MS);
  }
  if (issueCount < WIDEN_THRESHOLD) {
    return Math.min(intervalMs * 2, MAX_INTERVAL_MS);
  }
  return intervalMs;
}

export function createScopeStream(
  scope: string,
  fetchPage: PageFetcher,
  initialEndDate: Date,
  initialStartDate: Date,
  initialIntervalMs: number,
  abortSignal: AbortSignal,
): ScopeStream {
  let intervalMs = initialIntervalMs;
  let windowEnd = new Date(initialEndDate.getTime());
  let targetStart = new Date(initialStartDate.getTime());

  const controller = new AbortController();
  const linkAbort = () => controller.abort();
  if (abortSignal.aborted) {
    controller.abort();
  } else {
    abortSignal.addEventListener('abort', linkAbort, { once: true });
  }
  const signal = controller.signal;

  function getState(): AdaptiveFetchState {
    return { oldestFetchedDate: windowEnd, intervalMs };
  }

  function extendTarget(newStartDate: Date) {
    if (newStartDate.getTime() < targetStart.getTime()) {
      targetStart = new Date(newStartDate.getTime());
    }
  }

  function abort() {
    controller.abort();
  }

  async function* generator(): AsyncGenerator<ScopeStreamYield> {
    const baseQuery = `is:pr ${scope}`;

    try {
      while (!signal.aborted) {
        if (!(windowEnd > targetStart)) {
          yield SCOPE_STREAM_IDLE;
          continue;
        }

        const windowStart = new Date(
          Math.max(windowEnd.getTime() - intervalMs, targetStart.getTime()),
        );

        const dateFilter = `created:${formatDate(windowStart)}..${formatDate(
          windowEnd,
        )}`;
        const query = `${baseQuery} ${dateFilter}`;

        const firstPage = await fetchPage(query, null, signal);
        if (signal.aborted) break;

        if (
          firstPage.issueCount > GITHUB_SEARCH_LIMIT &&
          intervalMs > MIN_INTERVAL_MS
        ) {
          intervalMs = Math.max(Math.floor(intervalMs / 2), MIN_INTERVAL_MS);
          continue;
        }

        for (const pr of firstPage.prs) {
          yield pr;
        }

        let cursor = firstPage.endCursor;
        let hasNext = firstPage.hasNextPage;
        while (hasNext && !signal.aborted) {
          const page = await fetchPage(query, cursor, signal);
          for (const pr of page.prs) {
            yield pr;
          }
          hasNext = page.hasNextPage;
          cursor = page.endCursor;
        }

        if (signal.aborted) break;

        intervalMs = adaptInterval(intervalMs, firstPage.issueCount);
        windowEnd = windowStart;
      }
    } catch (err) {
      if (signal.aborted || isAbortError(err)) {
        return;
      }
      throw err instanceof Error
        ? err
        : new Error('Unknown error in scope stream');
    } finally {
      abortSignal.removeEventListener('abort', linkAbort);
    }
  }

  return {
    generator: generator(),
    getState,
    extendTarget,
    abort,
  };
}
