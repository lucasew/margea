import { test, expect } from '@playwright/test';
import {
  createScopeStream,
  type PageFetcher,
  type PageResult,
  type ScopeStream,
  INITIAL_INTERVAL_MS,
} from '../src/services/AdaptiveScopeFetcher';
import {
  createPRFetchSession,
  scopesToSearchQuery,
  type PRFetchSessionStatus,
  type StreamFactory,
} from '../src/services/prFetchSession';
import type { PullRequest } from '../src/types';
import { makePR } from './utils/makePR';

const DAY_MS = 24 * 60 * 60 * 1000;

function page(prs: PullRequest[], issueCount = prs.length): PageResult {
  return { prs, issueCount, hasNextPage: false, endCursor: null };
}

function waitFor(get: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (get()) return resolve();
      if (Date.now() - start > timeoutMs) {
        return reject(new Error('waitFor timeout'));
      }
      setTimeout(tick, 5);
    };
    tick();
  });
}

function streamFactory(fetchPage: PageFetcher): StreamFactory {
  return (scopes, signal) => {
    const now = new Date('2026-01-08T00:00:00Z');
    const start = new Date(now.getTime() - DAY_MS);
    const streams = new Map<string, ScopeStream>();
    for (const scope of scopes) {
      streams.set(
        scope,
        createScopeStream(
          scope,
          fetchPage,
          now,
          start,
          INITIAL_INTERVAL_MS,
          signal,
        ),
      );
    }
    return streams;
  };
}

test.describe('scopesToSearchQuery', () => {
  test('joins scopes for UI searchQuery', () => {
    expect(scopesToSearchQuery([])).toBe('');
    expect(scopesToSearchQuery(['org:acme', 'user:me'])).toBe(
      'is:pr org:acme or user:me',
    );
  });
});

test.describe('createPRFetchSession', () => {
  test('setScopes pulls batches and reports status', async () => {
    let calls = 0;
    const fetchPage: PageFetcher = async () => {
      calls += 1;
      return page([makePR(`pr-${calls}`)]);
    };

    const batches: PullRequest[][] = [];
    const statuses: PRFetchSessionStatus[] = [];

    const session = createPRFetchSession({
      createStreams: streamFactory(fetchPage),
      onBatch: (prs) => batches.push([...prs]),
      onStatus: (s) => statuses.push({ ...s }),
    });

    expect(session.setScopes(['author:me'])).toBe('changed');
    expect(session.setScopes(['author:me'])).toBe('noop');

    await waitFor(() => statuses.some((s) => !s.isLoading && s.hasNextPage));

    expect(batches.flat().map((p) => p.id)).toContain('pr-1');
    expect(session.getScopes()).toEqual(['author:me']);

    const last = statuses[statuses.length - 1];
    expect(last.isLoading).toBe(false);
    expect(last.isFetchingNextPage).toBe(false);
    expect(last.hasNextPage).toBe(true);
    expect(last.error).toBeNull();

    session.dispose();
  });

  test('loadMore extends window and pulls again', async () => {
    let calls = 0;
    const fetchPage: PageFetcher = async () => {
      calls += 1;
      return page([makePR(`pr-${calls}`)]);
    };

    const batches: string[] = [];
    let idle = false;

    const session = createPRFetchSession({
      createStreams: streamFactory(fetchPage),
      onBatch: (prs) => {
        for (const pr of prs) batches.push(pr.id);
      },
      onStatus: (s) => {
        if (!s.isLoading && !s.isFetchingNextPage && s.hasNextPage) {
          idle = true;
        }
      },
    });

    session.setScopes(['author:me']);
    await waitFor(() => idle);
    expect(calls).toBe(1);

    idle = false;
    session.loadMore();
    await waitFor(() => idle && calls >= 2);

    expect(calls).toBeGreaterThanOrEqual(2);
    expect(batches.length).toBeGreaterThanOrEqual(2);

    session.dispose();
  });

  test('dispose aborts in-flight work and ignores further commands', async () => {
    const fetchPage: PageFetcher = async (_q, _c, signal) => {
      await new Promise<void>((_resolve, reject) => {
        signal.addEventListener(
          'abort',
          () =>
            reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })),
          { once: true },
        );
      });
      return page([]);
    };

    const batches: PullRequest[][] = [];
    const session = createPRFetchSession({
      createStreams: streamFactory(fetchPage),
      onBatch: (prs) => batches.push([...prs]),
      onStatus: () => undefined,
    });

    session.setScopes(['author:me']);
    await new Promise((r) => setTimeout(r, 10));
    session.dispose();
    session.loadMore();
    session.refresh();
    expect(session.setScopes(['other'])).toBe('noop');
    expect(batches).toEqual([]);
  });
});
