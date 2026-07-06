import { test, expect } from '@playwright/test';
import {
  createScopeStream,
  SCOPE_STREAM_IDLE,
  type PageFetcher,
  type PageResult,
} from '../src/services/AdaptiveScopeFetcher';
import type { PullRequest } from '../src/types';

const DAY_MS = 24 * 60 * 60 * 1000;

function makePR(id: string, createdAt: string): PullRequest {
  return {
    id,
    number: Number(id.replace(/\D/g, '') || 1),
    title: id,
    body: null,
    state: 'OPEN',
    additions: 0,
    deletions: 0,
    ciStatus: null,
    createdAt,
    updatedAt: createdAt,
    mergedAt: null,
    closedAt: null,
    url: `https://example.com/${id}`,
    baseRefName: 'main',
    headRefName: `branch-${id}`,
    author: null,
    labels: null,
    repository: {
      id: 'repo',
      name: 'app',
      nameWithOwner: 'acme/app',
      owner: { login: 'acme' },
    },
  };
}

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
    let call = 0;
    const fetchPage: PageFetcher = async (query) => {
      queries.push(query);
      call += 1;
      return page([makePR(`pr-${call}`, '2026-01-07T12:00:00Z')]);
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
    expect(first.done).toBe(false);
    expect(first.prs.map((p) => p.id)).toEqual(['pr-1']);
    expect(queries).toHaveLength(1);
    expect(queries[0]).toContain('created:2026-01-07..2026-01-08');
    expect(stream.getState().oldestFetchedDate.toISOString()).toBe(
      '2026-01-07T00:00:00.000Z',
    );

    stream.extendTarget(new Date('2026-01-06T00:00:00Z'));
    const second = await drainUntilIdle(stream.generator);
    expect(second.idle).toBe(true);
    expect(second.prs.map((p) => p.id)).toEqual(['pr-2']);
    expect(queries).toHaveLength(2);
    expect(queries[1]).toContain('created:2026-01-06..2026-01-07');
    expect(stream.getState().oldestFetchedDate.toISOString()).toBe(
      '2026-01-06T00:00:00.000Z',
    );
  });

  test('abort while idle completes the generator on next pull', async () => {
    const fetchPage: PageFetcher = async () =>
      page([makePR('pr-1', '2026-01-07T12:00:00Z')]);

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

    stream.abort();
    const afterAbort = await stream.generator.next();
    expect(afterAbort.done).toBe(true);
  });

  test('pulling again without extendTarget yields idle immediately', async () => {
    let calls = 0;
    const fetchPage: PageFetcher = async () => {
      calls += 1;
      return page([makePR(`pr-${calls}`, '2026-01-07T12:00:00Z')]);
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
    expect(calls).toBe(1);

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
      return page([makePR(`pr-${queries.length}`, '2026-01-15T00:00:00Z')]);
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
    expect(queries[0]).toContain('created:2026-01-01..2026-01-31');
    expect(queries.length).toBeGreaterThan(1);
    expect(queries.some((q) => !q.includes('2026-01-01..2026-01-31'))).toBe(
      true,
    );
    expect(result.prs.length).toBeGreaterThan(0);
  });

  test('paginates within a single date window', async () => {
    const fetchPage: PageFetcher = async (_query, cursor) => {
      if (!cursor) {
        return {
          prs: [makePR('p1', '2026-01-07T12:00:00Z')],
          issueCount: 2,
          hasNextPage: true,
          endCursor: 'cursor-1',
        };
      }
      return {
        prs: [makePR('p2', '2026-01-07T11:00:00Z')],
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
    expect(result.idle).toBe(true);
  });
});
