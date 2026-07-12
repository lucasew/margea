import { test, expect } from '@playwright/test';
import type { PullRequest } from '../src/types';
import { calculateStats } from '../src/services/prStats';

/**
 * Minimal fixture: calculateStats only reads state and repository.nameWithOwner.
 */
function makePR(
  id: string,
  overrides: {
    state?: PullRequest['state'];
    nameWithOwner?: string;
  } = {},
): PullRequest {
  const nameWithOwner = overrides.nameWithOwner ?? 'acme/app';
  const [owner, name] = nameWithOwner.includes('/')
    ? nameWithOwner.split('/')
    : ['acme', nameWithOwner];

  return {
    id,
    number: 1,
    title: id,
    body: null,
    state: overrides.state ?? 'OPEN',
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
      id: nameWithOwner,
      name,
      nameWithOwner,
      owner: { login: owner },
    },
  };
}

test.describe('calculateStats', () => {
  test('empty list returns zero counts', () => {
    expect(calculateStats([])).toEqual({
      total: 0,
      open: 0,
      merged: 0,
      closed: 0,
      repositories: 0,
    });
  });

  test('counts by state and unique repositories', () => {
    const prs = [
      makePR('o1', { state: 'OPEN', nameWithOwner: 'acme/one' }),
      makePR('o2', { state: 'OPEN', nameWithOwner: 'acme/one' }),
      makePR('m1', { state: 'MERGED', nameWithOwner: 'acme/two' }),
      makePR('c1', { state: 'CLOSED', nameWithOwner: 'other/lib' }),
    ];

    expect(calculateStats(prs)).toEqual({
      total: 4,
      open: 2,
      merged: 1,
      closed: 1,
      repositories: 3,
    });
  });

  test('single open PR counts total, open, and one repository', () => {
    expect(
      calculateStats([
        makePR('only', { state: 'OPEN', nameWithOwner: 'acme/app' }),
      ]),
    ).toEqual({
      total: 1,
      open: 1,
      merged: 0,
      closed: 0,
      repositories: 1,
    });
  });

  test('all same repository still reports repositories: 1', () => {
    const prs = [
      makePR('a', { state: 'OPEN', nameWithOwner: 'acme/app' }),
      makePR('b', { state: 'MERGED', nameWithOwner: 'acme/app' }),
      makePR('c', { state: 'CLOSED', nameWithOwner: 'acme/app' }),
    ];

    expect(calculateStats(prs)).toEqual({
      total: 3,
      open: 1,
      merged: 1,
      closed: 1,
      repositories: 1,
    });
  });

  test('only merged and only closed', () => {
    expect(
      calculateStats([
        makePR('m1', { state: 'MERGED', nameWithOwner: 'a/r' }),
        makePR('m2', { state: 'MERGED', nameWithOwner: 'b/r' }),
      ]),
    ).toEqual({
      total: 2,
      open: 0,
      merged: 2,
      closed: 0,
      repositories: 2,
    });

    expect(
      calculateStats([makePR('c1', { state: 'CLOSED', nameWithOwner: 'x/y' })]),
    ).toEqual({
      total: 1,
      open: 0,
      merged: 0,
      closed: 1,
      repositories: 1,
    });
  });
});
