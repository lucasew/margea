import { test, expect } from '@playwright/test';
import {
  createScopeStream,
  type PageFetcher,
  type PageResult,
  type ScopeStream,
} from '../src/services/AdaptiveScopeFetcher';
import { createSerialQueue } from '../src/services/serialQueue';
import { pullStreamsUntilIdle } from '../src/services/prStorePull';
import type { PullRequest } from '../src/types';

const DAY_MS = 24 * 60 * 60 * 1000;

function makePR(id: string): PullRequest {
  return {
    id,
    number: 1,
    title: id,
    body: null,
    state: 'OPEN',
    additions: 0,
    deletions: 0,
    ciStatus: null,
    createdAt: '2026-01-07T12:00:00Z',
    updatedAt: '2026-01-07T12:00:00Z',
    mergedAt: null,
    closedAt: null,
    url: `https://example.com/${id}`,
    baseRefName: 'main',
    headRefName: `b-${id}`,
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

function makeStream(
  scope: string,
  fetchPage: PageFetcher,
  daysBack = 1,
): { stream: ScopeStream; abort: AbortController } {
  const end = new Date('2026-01-08T00:00:00Z');
  const start = new Date(end.getTime() - daysBack * DAY_MS);
  const ac = new AbortController();
  return {
    stream: createScopeStream(scope, fetchPage, end, start, DAY_MS, ac.signal),
    abort: ac,
  };
}

test.describe('createSerialQueue', () => {
  test('runs overlapping tasks strictly in order', async () => {
    const enqueue = createSerialQueue();
    const order: string[] = [];

    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = enqueue(async () => {
      order.push('first-start');
      await firstGate;
      order.push('first-end');
      return 1;
    });

    const second = enqueue(async () => {
      order.push('second-start');
      order.push('second-end');
      return 2;
    });

    await Promise.resolve();
    expect(order).toEqual(['first-start']);

    releaseFirst();
    await expect(first).resolves.toBe(1);
    await expect(second).resolves.toBe(2);
    expect(order).toEqual([
      'first-start',
      'first-end',
      'second-start',
      'second-end',
    ]);
  });

  test('queues the next task even when the previous rejects', async () => {
    const enqueue = createSerialQueue();
    const order: string[] = [];

    const failing = enqueue(async () => {
      order.push('fail');
      throw new Error('boom');
    });
    const ok = enqueue(async () => {
      order.push('ok');
      return 'done';
    });

    await expect(failing).rejects.toThrow('boom');
    await expect(ok).resolves.toBe('done');
    expect(order).toEqual(['fail', 'ok']);
  });
});

test.describe('pullStreamsUntilIdle', () => {
  test('ingests PRs in batches and reports active streams', async () => {
    let calls = 0;
    const fetchPage: PageFetcher = async () => {
      calls += 1;
      return page([makePR(`pr-${calls}`), makePR(`pr-${calls}-b`)]);
    };
    const { stream } = makeStream('author:me', fetchPage);
    const streams = new Map([['author:me', stream]]);
    const batches: PullRequest[][] = [];
    let firstPr = 0;

    const result = await pullStreamsUntilIdle(streams, {
      batchSize: 2,
      onBatch: (prs) => batches.push([...prs]),
      onFirstPr: () => {
        firstPr += 1;
      },
    });

    expect(result.count).toBe(2);
    expect(result.hasActiveStreams).toBe(true);
    expect(result.errors).toEqual([]);
    expect(firstPr).toBe(1);
    expect(batches.length).toBe(1);
    expect(batches[0].map((p) => p.id)).toEqual(['pr-1', 'pr-1-b']);
  });

  test('serialized pulls never interleave generator.next on one stream', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    let calls = 0;

    const fetchPage: PageFetcher = async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 20));
      inFlight -= 1;
      calls += 1;
      return page([makePR(`pr-${calls}`)]);
    };

    const { stream } = makeStream('author:me', fetchPage, 1);
    const streams = new Map([['author:me', stream]]);
    const enqueue = createSerialQueue();

    const pull = () =>
      enqueue(() =>
        pullStreamsUntilIdle(streams, {
          onBatch: () => undefined,
        }),
      );

    const first = pull();
    await new Promise((r) => setTimeout(r, 5));
    stream.extendTarget(new Date('2026-01-06T00:00:00Z'));
    const second = pull();

    const [a, b] = await Promise.all([first, second]);
    // extendTarget during the first drain lets that drain keep going; the
    // queued pull then sees idle. What matters is no overlapping fetches.
    expect(a.count + b.count).toBe(2);
    expect(calls).toBe(2);
    expect(maxInFlight).toBe(1);
    expect([a.count, b.count].sort()).toEqual([0, 2]);
  });

  test('does not surface abort errors from failed scopes', async () => {
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

    const { stream, abort } = makeStream('author:me', fetchPage);
    const streams = new Map([['author:me', stream]]);
    const pull = pullStreamsUntilIdle(streams, { onBatch: () => undefined });
    await new Promise((r) => setTimeout(r, 10));
    abort.abort();
    stream.abort();
    streams.clear();

    const result = await pull;
    expect(result.errors).toEqual([]);
    expect(result.hasActiveStreams).toBe(false);
  });
});
