import { test, expect } from '@playwright/test';
import {
  createScopeStream,
  SCOPE_STREAM_IDLE,
  type PageFetcher,
  type PageResult,
} from '../src/services/AdaptiveScopeFetcher';
import type { PullRequest } from '../src/types';
import { createAbortError, isAbortError } from '../src/utils/abort';
import { makePR } from './utils/makePR';

const DAY_MS = 24 * 60 * 60 * 1000;

function page(prs: PullRequest[], issueCount = prs.length): PageResult {
  return { prs, issueCount, hasNextPage: false, endCursor: null };
}

async function drainUntilIdle(
  generator: AsyncGenerator<unknown>,
): Promise<{ prs: PullRequest[]; idle: boolean; done: boolean }> {
  const prs: PullRequest[] = [];
  while (true) {
    const { value, done } = await generator.next();
    if (done) return { prs, idle: false, done: true };
    if (value === SCOPE_STREAM_IDLE) return { prs, idle: true, done: false };
    if (value && typeof value === 'object' && 'id' in value) {
      prs.push(value as PullRequest);
    }
  }
}

test.describe('createScopeStream', () => {
  test('yields idle after catching up and resumes after extendTarget', async () => {
    const queries: string[] = [];
    const signals: AbortSignal[] = [];
    let call = 0;
    const fetchPage: PageFetcher = async (query, _cursor, signal) => {
      queries.push(query);
      signals.push(signal);
      call += 1;
      return page([
        makePR(`pr-${call}`, {
          createdAt: '2026-01-07T12:00:00Z',
          updatedAt: '2026-01-07T12:00:00Z',
        }),
      ]);
    };

    const end = new Date('2026-01-08T00:00:00Z');
    const start = new Date('2026-01-07T00:00:00Z');
    const ac = new AbortController();
    const stream = createScopeStream(
      'author:me',
      fetchPage,
      end,
      start,
      DAY_MS,
      ac.signal,
    );

    const first = await drainUntilIdle(stream.generator);
    expect(first.idle).toBe(true);
    expect(first.prs.map((p) => p.id)).toEqual(['pr-1']);
    expect(queries[0]).toContain('created:2026-01-07..2026-01-08');
    expect(signals[0]?.aborted).toBe(false);

    stream.extendTarget(new Date('2026-01-06T00:00:00Z'));
    const second = await drainUntilIdle(stream.generator);
    expect(second.prs.map((p) => p.id)).toEqual(['pr-2']);
    expect(queries).toHaveLength(2);
  });

  test('abort rejects in-flight fetchPage via signal', async () => {
    let sawAbort = false;
    const fetchPage: PageFetcher = async (_q, _c, signal) => {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => resolve(), 5_000);
        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            sawAbort = true;
            reject(createAbortError());
          },
          { once: true },
        );
      });
      return page([]);
    };

    const end = new Date('2026-01-08T00:00:00Z');
    const start = new Date('2026-01-07T00:00:00Z');
    const ac = new AbortController();
    const stream = createScopeStream(
      'author:me',
      fetchPage,
      end,
      start,
      DAY_MS,
      ac.signal,
    );

    const pull = drainUntilIdle(stream.generator);
    await new Promise((r) => setTimeout(r, 10));
    stream.abort();
    const result = await pull;
    expect(result.done).toBe(true);
    expect(sawAbort).toBe(true);
  });

  test('abort while idle completes the generator on next pull', async () => {
    const fetchPage: PageFetcher = async () =>
      page([
        makePR('pr-1', {
          createdAt: '2026-01-07T12:00:00Z',
          updatedAt: '2026-01-07T12:00:00Z',
        }),
      ]);

    const end = new Date('2026-01-08T00:00:00Z');
    const start = new Date('2026-01-07T00:00:00Z');
    const ac = new AbortController();
    const stream = createScopeStream(
      'author:me',
      fetchPage,
      end,
      start,
      DAY_MS,
      ac.signal,
    );

    expect((await drainUntilIdle(stream.generator)).idle).toBe(true);
    stream.abort();
    expect((await stream.generator.next()).done).toBe(true);
  });

  test('pulling again without extendTarget yields idle immediately', async () => {
    let calls = 0;
    const fetchPage: PageFetcher = async () => {
      calls += 1;
      return page([
        makePR(`pr-${calls}`, {
          createdAt: '2026-01-07T12:00:00Z',
          updatedAt: '2026-01-07T12:00:00Z',
        }),
      ]);
    };

    const end = new Date('2026-01-08T00:00:00Z');
    const start = new Date('2026-01-07T00:00:00Z');
    const ac = new AbortController();
    const stream = createScopeStream(
      'author:me',
      fetchPage,
      end,
      start,
      DAY_MS,
      ac.signal,
    );

    await drainUntilIdle(stream.generator);
    const again = await drainUntilIdle(stream.generator);
    expect(again.idle).toBe(true);
    expect(again.prs).toEqual([]);
    expect(calls).toBe(1);
  });

  test('splits windows when GitHub search limit is exceeded', async () => {
    const queries: string[] = [];
    const fetchPage: PageFetcher = async (query) => {
      queries.push(query);
      if (query.includes('2026-01-01..2026-01-31')) {
        return page([], 1001);
      }
      return page([
        makePR(`pr-${queries.length}`, {
          createdAt: '2026-01-15T00:00:00Z',
          updatedAt: '2026-01-15T00:00:00Z',
        }),
      ]);
    };

    const end = new Date('2026-01-31T00:00:00Z');
    const start = new Date('2026-01-01T00:00:00Z');
    const ac = new AbortController();
    const stream = createScopeStream(
      'org:acme',
      fetchPage,
      end,
      start,
      30 * DAY_MS,
      ac.signal,
    );

    const result = await drainUntilIdle(stream.generator);
    expect(result.idle).toBe(true);
    expect(queries.length).toBeGreaterThan(1);
    expect(result.prs.length).toBeGreaterThan(0);
  });

  test('paginates within a single date window', async () => {
    const fetchPage: PageFetcher = async (_query, cursor) => {
      if (!cursor) {
        return {
          prs: [
            makePR('p1', {
              createdAt: '2026-01-07T12:00:00Z',
              updatedAt: '2026-01-07T12:00:00Z',
            }),
          ],
          issueCount: 2,
          hasNextPage: true,
          endCursor: 'cursor-1',
        };
      }
      return {
        prs: [
          makePR('p2', {
            createdAt: '2026-01-07T11:00:00Z',
            updatedAt: '2026-01-07T11:00:00Z',
          }),
        ],
        issueCount: 2,
        hasNextPage: false,
        endCursor: null,
      };
    };

    const end = new Date('2026-01-08T00:00:00Z');
    const start = new Date('2026-01-07T00:00:00Z');
    const ac = new AbortController();
    const stream = createScopeStream(
      'author:me',
      fetchPage,
      end,
      start,
      DAY_MS,
      ac.signal,
    );

    const result = await drainUntilIdle(stream.generator);
    expect(result.prs.map((p) => p.id)).toEqual(['p1', 'p2']);
  });
});

test.describe('abort helpers', () => {
  test('isAbortError detects AbortError name', () => {
    expect(isAbortError(createAbortError())).toBe(true);
    expect(isAbortError(new Error('nope'))).toBe(false);
  });
});
