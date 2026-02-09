import { PullRequest } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_INTERVAL_MS = DAY_MS;
const MAX_INTERVAL_MS = 30 * DAY_MS;
const WIDEN_THRESHOLD = 200;
const NARROW_THRESHOLD = 500;
const GITHUB_SEARCH_LIMIT = 1000;

function formatDate(date: Date): string {
  return [
    date.getUTCFullYear(),
    (date.getUTCMonth() + 1).toString().padStart(2, '0'),
    date.getUTCDate().toString().padStart(2, '0'),
  ].join('-');
}

export interface ScopeProgress {
  scope: string;
  fetched: number;
  done: boolean;
  error: Error | null;
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

export class AdaptiveScopeFetcher {
  constructor(
    private scope: string,
    private fetchPage: PageFetcher,
    private onBatch: (prs: PullRequest[]) => void,
    private onProgress: (progress: ScopeProgress) => void,
  ) {}

  async fetch(
    endDate: Date,
    startDate: Date,
    initialIntervalMs: number,
    signal: AbortSignal,
  ): Promise<{ progress: ScopeProgress; state: AdaptiveFetchState }> {
    const baseQuery = `is:pr ${this.scope}`;
    let intervalMs = initialIntervalMs;
    let windowEnd = endDate;
    let totalFetched = 0;

    const progress: ScopeProgress = {
      scope: this.scope,
      fetched: 0,
      done: false,
      error: null,
    };

    try {
      while (windowEnd > startDate && !signal.aborted) {
        const windowStart = new Date(
          Math.max(windowEnd.getTime() - intervalMs, startDate.getTime()),
        );

        const dateFilter = `created:${formatDate(windowStart)}..${formatDate(
          windowEnd,
        )}`;
        const query = `${baseQuery} ${dateFilter}`;

        // Probe: fetch first page to check issueCount before full pagination
        const firstPage = await this.fetchPage(query, null);
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
          this.onBatch(firstPage.prs);
        }

        // Paginate remaining pages in this window
        let cursor = firstPage.endCursor;
        let hasNext = firstPage.hasNextPage;
        while (hasNext && !signal.aborted) {
          const page = await this.fetchPage(query, cursor);
          if (page.prs.length > 0) {
            totalFetched += page.prs.length;
            this.onBatch(page.prs);
          }
          hasNext = page.hasNextPage;
          cursor = page.endCursor;
        }

        progress.fetched = totalFetched;
        this.onProgress({ ...progress });

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
      this.onProgress({ ...progress });

      return {
        progress,
        state: { oldestFetchedDate: windowEnd, intervalMs },
      };
    } catch (err) {
      progress.error =
        err instanceof Error ? err : new Error('Unknown error in scope fetch');
      progress.done = true;
      this.onProgress({ ...progress });

      return {
        progress,
        state: { oldestFetchedDate: windowEnd, intervalMs },
      };
    }
  }
}
