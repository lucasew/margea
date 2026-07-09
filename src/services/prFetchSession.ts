import {
  createScopeStream,
  type ScopeStream,
  type AdaptiveFetchState,
  type PageFetcher,
  INITIAL_INTERVAL_MS,
} from './AdaptiveScopeFetcher';
import { createSerialQueue } from './serialQueue';
import { pullStreamsUntilIdle } from './prStorePull';
import { INITIAL_FETCH_DAYS, LOAD_MORE_DAYS } from '../constants';
import type { PullRequest } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PRFetchSessionStatus {
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  error: Error | null;
  oldestFetchedDate: Date | null;
}

/** Result of setScopes: noop if key unchanged; otherwise streams were (re)started or cleared. */
export type SetScopesResult = 'noop' | 'changed';

export interface PRFetchSession {
  /**
   * Replace scopes and start a fresh stream set.
   * Returns 'noop' when the sorted scope key is unchanged.
   */
  setScopes: (scopes: string[]) => SetScopesResult;
  /** Restart streams for current scopes (caller keeps its PR map). */
  refresh: () => void;
  /** Extend the date window further into the past and pull. */
  loadMore: () => void;
  getScopes: () => string[];
  getScopeKey: () => string;
  dispose: () => void;
}

export type StreamFactory = (
  scopes: string[],
  signal: AbortSignal,
) => Map<string, ScopeStream>;

export interface PRFetchSessionOptions {
  onBatch: (prs: PullRequest[]) => void;
  onStatus: (status: PRFetchSessionStatus) => void;
  /** Builds live scope streams for a scope set (production: page fetcher + dates). */
  createStreams: StreamFactory;
}

/** Build the default stream factory used by PRProvider. */
export function createDefaultStreamFactory(
  pageFetcher: PageFetcher,
): StreamFactory {
  return (scopes, signal) => {
    const now = new Date();
    const initialStart = new Date(now.getTime() - INITIAL_FETCH_DAYS * DAY_MS);
    const streams = new Map<string, ScopeStream>();

    for (const scope of scopes) {
      streams.set(
        scope,
        createScopeStream(
          scope,
          pageFetcher,
          now,
          initialStart,
          INITIAL_INTERVAL_MS,
          signal,
        ),
      );
    }

    return streams;
  };
}

function minOldestDate(states: Map<string, AdaptiveFetchState>): Date | null {
  if (states.size === 0) return null;
  const dates = Array.from(states.values()).map((s) =>
    s.oldestFetchedDate.getTime(),
  );
  return new Date(Math.min(...dates));
}

/**
 * Imperative multi-scope PR fetch machine. Owns streams, abort, and serial
 * pulls so React only adapts status/batches into state.
 *
 * Deliberately free of Relay imports so the session is unit-testable with a
 * fake StreamFactory.
 */
export function createPRFetchSession(
  options: PRFetchSessionOptions,
): PRFetchSession {
  const { onBatch, onStatus, createStreams } = options;

  let abortController: AbortController | null = null;
  let streams = new Map<string, ScopeStream>();
  let scopes: string[] = [];
  let scopeKey = '';
  let disposed = false;
  const enqueue = createSerialQueue();

  let status: PRFetchSessionStatus = {
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    error: null,
    oldestFetchedDate: null,
  };

  function emitStatus(patch: Partial<PRFetchSessionStatus>) {
    status = { ...status, ...patch };
    if (!disposed) onStatus(status);
  }

  function getCurrentStates(): Map<string, AdaptiveFetchState> {
    const out = new Map<string, AdaptiveFetchState>();
    streams.forEach((strm, scope) => {
      out.set(scope, strm.getState());
    });
    return out;
  }

  function abortAllStreams() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    streams.forEach((s) => s.abort());
    streams = new Map();
  }

  function pullAndIngest(isLoadMore: boolean) {
    return enqueue(async () => {
      if (disposed) return 0;

      if (streams.size === 0) {
        emitStatus({
          isLoading: false,
          isFetchingNextPage: false,
          hasNextPage: false,
        });
        return 0;
      }

      if (!isLoadMore) {
        emitStatus({ isLoading: true, error: null });
      } else {
        emitStatus({ isFetchingNextPage: true, error: null });
      }

      let flipped = false;
      const result = await pullStreamsUntilIdle(streams, {
        onBatch: (prs) => {
          if (!disposed) onBatch(prs);
        },
        onFirstPr: () => {
          if (!isLoadMore && !flipped) {
            flipped = true;
            emitStatus({ isLoading: false, isFetchingNextPage: true });
          }
        },
      });

      if (disposed) return result.count;

      const oldestFetchedDate = minOldestDate(getCurrentStates());
      const error =
        result.errors.length > 0
          ? new Error(
              `Failed to fetch PRs for: ${result.errors
                .map((e) => e.scope)
                .join(', ')}. ${result.errors[0].error.message}`,
            )
          : null;

      emitStatus({
        isLoading: false,
        isFetchingNextPage: false,
        hasNextPage: result.hasActiveStreams,
        oldestFetchedDate,
        error,
      });

      return result.count;
    });
  }

  function startStreams(nextScopes: string[]) {
    abortAllStreams();

    if (nextScopes.length === 0) {
      emitStatus({
        hasNextPage: false,
        oldestFetchedDate: null,
        error: null,
        isLoading: false,
        isFetchingNextPage: false,
      });
      return;
    }

    emitStatus({
      error: null,
      oldestFetchedDate: null,
    });

    const master = new AbortController();
    abortController = master;
    streams = createStreams(nextScopes, master.signal);
    void pullAndIngest(false);
  }

  return {
    setScopes(nextScopes: string[]): SetScopesResult {
      if (disposed) return 'noop';
      const newKey = nextScopes.slice().sort().join('\n');
      if (newKey === scopeKey) return 'noop';
      scopeKey = newKey;
      scopes = nextScopes;
      startStreams(nextScopes);
      return 'changed';
    },

    refresh() {
      if (disposed || scopes.length === 0) return;
      startStreams(scopes);
    },

    loadMore() {
      if (
        disposed ||
        status.isLoading ||
        status.isFetchingNextPage ||
        streams.size === 0
      ) {
        return;
      }

      const states = getCurrentStates();
      if (states.size === 0) return;

      const oldest = minOldestDate(states);
      if (!oldest) return;

      const newTargetStart = new Date(
        oldest.getTime() - LOAD_MORE_DAYS * DAY_MS,
      );
      streams.forEach((strm) => strm.extendTarget(newTargetStart));
      void pullAndIngest(true);
    },

    getScopes() {
      return scopes.slice();
    },

    getScopeKey() {
      return scopeKey;
    },

    dispose() {
      disposed = true;
      abortAllStreams();
    },
  };
}

/** Synthetic searchQuery string kept for UI that still reads PRContext.searchQuery. */
export function scopesToSearchQuery(scopes: string[]): string {
  return scopes.length > 0 ? `is:pr ${scopes.join(' or ')}` : '';
}
