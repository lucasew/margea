import { PullRequest } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_INTERVAL_MS = DAY_MS;
const MAX_INTERVAL_MS = 30 * DAY_MS;
const WIDEN_THRESHOLD = 200;
const NARROW_THRESHOLD = 500;
const GITHUB_SEARCH_LIMIT = 1000;

/**
 * Formats a given Date object into an ISO date string (`YYYY-MM-DD`).
 *
 * This exact format is necessary because the GitHub Search API relies on it
 * for its `created:YYYY-MM-DD..YYYY-MM-DD` syntax. Including time or using
 * other formats can lead to parsing errors or imprecise filtering on GitHub's end.
 *
 * @param date - The Date object to format.
 * @returns The formatted date string in `YYYY-MM-DD` format.
 */
function formatDate(date: Date): string {
  return [
    date.getUTCFullYear(),
    (date.getUTCMonth() + 1).toString().padStart(2, '0'),
    date.getUTCDate().toString().padStart(2, '0'),
  ].join('-');
}

/**
 * Tracks the ongoing data extraction progress for a single scope (e.g., an org or user).
 */
export interface ScopeProgress {
  /** The identifier for the scope being fetched (e.g., org:my-org). */
  scope: string;
  /** The total number of PRs fetched so far. */
  fetched: number;
  /** Indicates whether the fetching process has reached the target startDate or was naturally completed. */
  done: boolean;
  /** Captures any error encountered during fetching to enable graceful failure. */
  error: Error | null;
}

/**
 * Represents the resumable state of a fetch operation for a specific scope.
 *
 * This is used to persist where the fetcher left off, allowing subsequent
 * queries (like a "load more" action) to resume seamlessly without fetching
 * duplicate data.
 */
export interface AdaptiveFetchState {
  /** The earliest date that has been successfully fetched. */
  oldestFetchedDate: Date;
  /** The currently tuned interval size, optimized based on recent fetch density. */
  intervalMs: number;
}

/**
 * Represents a single page of results retrieved from the GraphQL API.
 */
export interface PageResult {
  /** The list of Pull Requests in the current page. */
  prs: PullRequest[];
  /** The total number of items matching the query, used to detect if the GitHub API's 1000-item hard limit is exceeded. */
  issueCount: number;
  /** Whether more pages exist for the current query. */
  hasNextPage: boolean;
  /** The pagination cursor for fetching the next page. */
  endCursor: string | null;
}

/**
 * A function type that fetches a page of PR results given a specific search query and an optional cursor.
 */
export type PageFetcher = (
  query: string,
  cursor: string | null,
) => Promise<PageResult>;

/**
 * Handles fetching Pull Requests for a specific scope using an adaptive time-window strategy.
 *
 * The GitHub Search API has a hard limit of 1,000 results per query (the `GITHUB_SEARCH_LIMIT`).
 * To reliably fetch potentially thousands of PRs over a large timeframe without hitting this limit,
 * this class chunks the overall timeframe into smaller time "windows" (`created:start..end`).
 *
 * It probes the API with an initial interval. If the result count (`issueCount`) exceeds the
 * hard limit, it narrows the window size and retries. Conversely, if the window yields very few
 * results, it widens the next interval to reduce the number of API calls, adapting to the density
 * of PRs over time.
 */
export class AdaptiveScopeFetcher {
  /**
   * Initializes a new AdaptiveScopeFetcher.
   *
   * @param scope - The search scope string (e.g., `org:my-org` or `user:my-user`).
   * @param fetchPage - The function responsible for actually making the API call to fetch a single page.
   * @param onBatch - Callback fired whenever a new batch of PRs is successfully retrieved.
   * @param onProgress - Callback fired to update the external state about how many PRs have been fetched.
   */
  constructor(
    private scope: string,
    private fetchPage: PageFetcher,
    private onBatch: (prs: PullRequest[]) => void,
    private onProgress: (progress: ScopeProgress) => void,
  ) {}

  /**
   * Begins or resumes fetching PRs backwards in time.
   *
   * This method steps backwards from `endDate` down to `startDate`, continuously adjusting
   * its time window to avoid the GitHub 1000-item limit. It supports resumability via the
   * `AdaptiveFetchState` returned upon completion or abort.
   *
   * @param endDate - The most recent date to start fetching from (or the `oldestFetchedDate` if resuming).
   * @param startDate - The oldest date to fetch down to (the ultimate goal).
   * @param initialIntervalMs - The initial size of the time window to probe.
   * @param signal - An AbortSignal to cleanly cancel the fetching process mid-flight.
   * @returns An object containing the final `progress` and the `state` needed to resume later.
   */
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
