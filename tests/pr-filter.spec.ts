import { test, expect } from '@playwright/test';
import type { PullRequest } from '../src/types';
import { filterPullRequests } from '../src/services/prFilter';

/**
 * Minimal fixture: only fields filterPullRequests reads
 * (repository.nameWithOwner, repository.owner.login, author?.login, state).
 */
function makePR(
  id: string,
  overrides: {
    state?: PullRequest['state'];
    author?: PullRequest['author'];
    repository?: Partial<PullRequest['repository']> & {
      nameWithOwner?: string;
      owner?: { login: string };
    };
  } = {},
): PullRequest {
  const nameWithOwner =
    overrides.repository?.nameWithOwner ?? 'acme/app';
  const [defaultOwner, defaultName] = nameWithOwner.includes('/')
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
    author:
      overrides.author === undefined
        ? { login: 'bot', avatarUrl: '' }
        : overrides.author,
    labels: null,
    repository: {
      id: overrides.repository?.id ?? 'repo',
      name: overrides.repository?.name ?? defaultName,
      nameWithOwner,
      owner: overrides.repository?.owner ?? { login: defaultOwner },
    },
  };
}

const fixturePRs: PullRequest[] = [
  makePR('open-acme-bot', {
    state: 'OPEN',
    author: { login: 'renovate-bot', avatarUrl: '' },
    repository: {
      nameWithOwner: 'acme/web-app',
      owner: { login: 'acme' },
    },
  }),
  makePR('merged-acme-alice', {
    state: 'MERGED',
    author: { login: 'Alice', avatarUrl: '' },
    repository: {
      nameWithOwner: 'acme/api',
      owner: { login: 'acme' },
    },
  }),
  makePR('closed-other-bob', {
    state: 'CLOSED',
    author: { login: 'bob', avatarUrl: '' },
    repository: {
      nameWithOwner: 'other-org/lib',
      owner: { login: 'other-org' },
    },
  }),
  makePR('open-no-author', {
    state: 'OPEN',
    author: null,
    repository: {
      nameWithOwner: 'acme/orphan',
      owner: { login: 'acme' },
    },
  }),
];

test.describe('filterPullRequests', () => {
  test('no filters returns all PRs as a new array (copy via filter chain)', () => {
    const result = filterPullRequests(fixturePRs, {});
    expect(result.map((p) => p.id)).toEqual(fixturePRs.map((p) => p.id));
    // Implementation starts with [...prs]; always a new array reference.
    expect(result).not.toBe(fixturePRs);
    expect(result).toHaveLength(4);
  });

  test('repository partial case-insensitive match on nameWithOwner', () => {
    expect(
      filterPullRequests(fixturePRs, { repository: 'WEB' }).map((p) => p.id),
    ).toEqual(['open-acme-bot']);
    expect(
      filterPullRequests(fixturePRs, { repository: 'acme/' }).map((p) => p.id),
    ).toEqual(['open-acme-bot', 'merged-acme-alice', 'open-no-author']);
    expect(
      filterPullRequests(fixturePRs, { repository: 'lib' }).map((p) => p.id),
    ).toEqual(['closed-other-bob']);
  });

  test('state OPEN/MERGED/CLOSED exact; ALL and omitted keep all', () => {
    expect(
      filterPullRequests(fixturePRs, { state: 'OPEN' }).map((p) => p.id),
    ).toEqual(['open-acme-bot', 'open-no-author']);
    expect(
      filterPullRequests(fixturePRs, { state: 'MERGED' }).map((p) => p.id),
    ).toEqual(['merged-acme-alice']);
    expect(
      filterPullRequests(fixturePRs, { state: 'CLOSED' }).map((p) => p.id),
    ).toEqual(['closed-other-bob']);
    // 'ALL' is an inactive state filter (explicitly skipped in implementation).
    expect(
      filterPullRequests(fixturePRs, { state: 'ALL' }).map((p) => p.id),
    ).toEqual(fixturePRs.map((p) => p.id));
    // Omitted state keeps all.
    expect(filterPullRequests(fixturePRs, {}).map((p) => p.id)).toEqual(
      fixturePRs.map((p) => p.id),
    );
  });

  test('author partial case-insensitive on login; missing author does not match', () => {
    expect(
      filterPullRequests(fixturePRs, { author: 'alice' }).map((p) => p.id),
    ).toEqual(['merged-acme-alice']);
    expect(
      filterPullRequests(fixturePRs, { author: 'BOT' }).map((p) => p.id),
    ).toEqual(['open-acme-bot']);
    // null author: optional chaining yields undefined; does not match any author filter.
    expect(
      filterPullRequests(fixturePRs, { author: 'bot' }).map((p) => p.id),
    ).toEqual(['open-acme-bot']);
    expect(
      filterPullRequests(fixturePRs, { author: 'nobody' }).map((p) => p.id),
    ).toEqual([]);
  });

  test('owner partial case-insensitive on repository.owner.login', () => {
    expect(
      filterPullRequests(fixturePRs, { owner: 'ACME' }).map((p) => p.id),
    ).toEqual(['open-acme-bot', 'merged-acme-alice', 'open-no-author']);
    expect(
      filterPullRequests(fixturePRs, { owner: 'other' }).map((p) => p.id),
    ).toEqual(['closed-other-bob']);
  });

  test('AND combination of multiple filters', () => {
    expect(
      filterPullRequests(fixturePRs, {
        owner: 'acme',
        state: 'OPEN',
        author: 'renovate',
      }).map((p) => p.id),
    ).toEqual(['open-acme-bot']);

    expect(
      filterPullRequests(fixturePRs, {
        repository: 'acme',
        state: 'MERGED',
        author: 'alice',
        owner: 'acme',
      }).map((p) => p.id),
    ).toEqual(['merged-acme-alice']);

    // Contradictory filters yield empty.
    expect(
      filterPullRequests(fixturePRs, {
        state: 'CLOSED',
        owner: 'acme',
      }).map((p) => p.id),
    ).toEqual([]);
  });

  test('empty string filters behave as inactive (falsy repository/author/owner)', () => {
    // Empty strings are falsy, so repository/author/owner branches are skipped.
    const result = filterPullRequests(fixturePRs, {
      repository: '',
      author: '',
      owner: '',
    });
    expect(result.map((p) => p.id)).toEqual(fixturePRs.map((p) => p.id));
    expect(result).not.toBe(fixturePRs);
  });
});
