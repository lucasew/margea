import { test, expect } from '@playwright/test';
import type { PRGroup, PullRequest } from '../src/types';
import { parseSortStrategy, sortGroups } from '../src/services/prSort';
import { DEFAULT_SORT_STRATEGY } from '../src/constants';

function makePR(id: string, overrides: Partial<PullRequest> = {}): PullRequest {
  return {
    id,
    number: 1,
    title: id,
    body: null,
    state: 'OPEN',
    additions: 0,
    deletions: 0,
    ciStatus: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    mergedAt: null,
    closedAt: null,
    url: `https://example.com/${id}`,
    baseRefName: 'main',
    headRefName: `b-${id}`,
    author: { login: 'bot', avatarUrl: '' },
    labels: null,
    repository: {
      id: 'repo',
      name: 'app',
      nameWithOwner: 'acme/app',
      owner: { login: 'acme' },
    },
    ...overrides,
  };
}

function makeGroup(
  key: string,
  prs: PullRequest[],
  packageName = key,
): PRGroup {
  return {
    key,
    package: packageName,
    baseRef: 'main',
    labels: [],
    prs,
    count: prs.length,
  };
}

test.describe('parseSortStrategy', () => {
  test('defaults invalid or missing values to count', () => {
    expect(parseSortStrategy(null)).toBe(DEFAULT_SORT_STRATEGY);
    expect(parseSortStrategy(undefined)).toBe('count');
    expect(parseSortStrategy('nope')).toBe('count');
  });

  test('accepts known strategies', () => {
    expect(parseSortStrategy('updated')).toBe('updated');
    expect(parseSortStrategy('ci_failures')).toBe('ci_failures');
  });
});

test.describe('sortGroups', () => {
  const groups = [
    makeGroup(
      'beta',
      [
        makePR('b1', {
          updatedAt: '2026-03-01T00:00:00Z',
          createdAt: '2026-01-10T00:00:00Z',
          ciStatus: 'SUCCESS',
          repository: {
            id: 'r1',
            name: 'one',
            nameWithOwner: 'acme/one',
            owner: { login: 'acme' },
          },
        }),
      ],
      'beta',
    ),
    makeGroup(
      'alpha',
      [
        makePR('a1', {
          updatedAt: '2026-02-01T00:00:00Z',
          createdAt: '2026-02-10T00:00:00Z',
          ciStatus: 'FAILURE',
          repository: {
            id: 'r1',
            name: 'one',
            nameWithOwner: 'acme/one',
            owner: { login: 'acme' },
          },
        }),
        makePR('a2', {
          updatedAt: '2026-01-15T00:00:00Z',
          createdAt: '2026-01-05T00:00:00Z',
          ciStatus: 'FAILURE',
          repository: {
            id: 'r2',
            name: 'two',
            nameWithOwner: 'acme/two',
            owner: { login: 'acme' },
          },
        }),
      ],
      'alpha',
    ),
    makeGroup(
      'gamma',
      [
        makePR('g1', {
          updatedAt: '2026-01-20T00:00:00Z',
          createdAt: '2026-03-01T00:00:00Z',
          ciStatus: null,
          repository: {
            id: 'r3',
            name: 'three',
            nameWithOwner: 'acme/three',
            owner: { login: 'acme' },
          },
        }),
      ],
      'gamma',
    ),
  ];

  test('count sorts by size descending with name tie-break', () => {
    expect(sortGroups(groups, 'count').map((g) => g.key)).toEqual([
      'alpha',
      'beta',
      'gamma',
    ]);
  });

  test('updated sorts by max updatedAt descending', () => {
    expect(sortGroups(groups, 'updated').map((g) => g.key)).toEqual([
      'beta',
      'alpha',
      'gamma',
    ]);
  });

  test('oldest sorts by min updatedAt ascending', () => {
    expect(sortGroups(groups, 'oldest').map((g) => g.key)).toEqual([
      'alpha',
      'gamma',
      'beta',
    ]);
  });

  test('name sorts A-Z', () => {
    expect(sortGroups(groups, 'name').map((g) => g.key)).toEqual([
      'alpha',
      'beta',
      'gamma',
    ]);
  });

  test('ci_failures sorts by failure count descending', () => {
    expect(sortGroups(groups, 'ci_failures').map((g) => g.key)).toEqual([
      'alpha',
      'beta',
      'gamma',
    ]);
  });

  test('ci_failures counts only FAILURE (not PENDING or SUCCESS)', () => {
    const withPending = [
      makeGroup('many-pending', [
        makePR('p1', { ciStatus: 'PENDING' }),
        makePR('p2', { ciStatus: 'PENDING' }),
        makePR('p3', { ciStatus: 'SUCCESS' }),
      ]),
      makeGroup('one-failure', [makePR('f1', { ciStatus: 'FAILURE' })]),
    ];
    expect(sortGroups(withPending, 'ci_failures').map((g) => g.key)).toEqual([
      'one-failure',
      'many-pending',
    ]);
  });

  test('repos sorts by unique repositories descending', () => {
    expect(sortGroups(groups, 'repos').map((g) => g.key)).toEqual([
      'alpha',
      'beta',
      'gamma',
    ]);
  });

  test('created sorts by max createdAt descending', () => {
    expect(sortGroups(groups, 'created').map((g) => g.key)).toEqual([
      'gamma',
      'alpha',
      'beta',
    ]);
  });

  test('does not mutate the input array', () => {
    const original = groups.map((g) => g.key);
    sortGroups(groups, 'name');
    expect(groups.map((g) => g.key)).toEqual(original);
  });
});
