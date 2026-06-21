import { PullRequest } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_INTERVAL_MS = DAY_MS;
const MAX_INTERVAL_MS = 30 * DAY_MS;
const WIDEN_THRESHOLD = 200;
const NARROW_THRESHOLD = 500;
const GITHUB_SEARCH_LIMIT = 1000;

export const INITIAL_INTERVAL_MS = DAY_MS;

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
) => Promise<PageResult>;

export interface ScopeStream {
  generator: AsyncGenerator<PullRequest>;
  getState: () => AdaptiveFetchState;
  extendTarget: (newStartDate: Date) => void;
  abort: () => void;
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

  async function* generator(): AsyncGenerator<PullRequest> {
    const baseQuery = `is:pr ${scope}`;

    const doFetch = async (query: string, cursor: string | null) => {
      return fetchPage(query, cursor);
    };

    try {
      while (windowEnd > targetStart && !signal.aborted) {
        const windowStart = new Date(
          Math.max(windowEnd.getTime() - intervalMs, targetStart.getTime()),
        );

        const dateFilter = `created:${formatDate(windowStart)}..${formatDate(
          windowEnd,
        )}`;
        const query = `${baseQuery} ${dateFilter}`;

        // Probe: fetch first page to get issueCount + first results
        const firstPage = await doFetch(query, null);
        if (signal.aborted) break;

        // GitHub hard cap guard: split window and retry
        if (
          firstPage.issueCount > GITHUB_SEARCH_LIMIT &&
          intervalMs > MIN_INTERVAL_MS
        ) {
          intervalMs = Math.max(Math.floor(intervalMs / 2), MIN_INTERVAL_MS);
          continue;
        }

        // Yield PRs from the probe page immediately (stream as found)
        for (const pr of firstPage.prs) {
          yield pr;
        }

        // Yield the rest of the pages for this window (stream as found)
        let cursor = firstPage.endCursor;
        let hasNext = firstPage.hasNextPage;
        while (hasNext && !signal.aborted) {
          const page = await doFetch(query, cursor);
          for (const pr of page.prs) {
            yield pr;
          }
          hasNext = page.hasNextPage;
          cursor = page.endCursor;
        }

        // Adapt interval based on density from the probe
        if (firstPage.issueCount > NARROW_THRESHOLD) {
          intervalMs = Math.max(Math.floor(intervalMs / 2), MIN_INTERVAL_MS);
        } else if (firstPage.issueCount < WIDEN_THRESHOLD) {
          intervalMs = Math.min(intervalMs * 2, MAX_INTERVAL_MS);
        }

        // Advance frontier
        windowEnd = windowStart;
      }
    } catch (err) {
      // Preserve frontier in getState(), surface failure to the puller
      throw err instanceof Error
        ? err
        : new Error('Unknown error in scope stream');
    } finally {
      abortSignal.removeEventListener('abort', linkAbort);
    }
    // Natural end: no more yields for current targetStart. Consumer can extendTarget and pull again.
  }

  return {
    generator: generator(),
    getState,
    extendTarget,
    abort,
  };
}
