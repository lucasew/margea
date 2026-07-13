import type { PullRequest } from '../../src/types';

/** Overrides for makePR; repository is shallow-merged (owner nested). */
export type MakePROverrides = Partial<
  Omit<PullRequest, 'repository' | 'author'>
> & {
  author?: PullRequest['author'];
  repository?: Partial<Omit<PullRequest['repository'], 'owner'>> & {
    owner?: Partial<PullRequest['repository']['owner']>;
  };
};

/**
 * Shared PullRequest fixture for unit specs.
 * Covers the common fields; pass overrides for fields under test.
 */
export function makePR(
  id: string,
  overrides: MakePROverrides = {},
): PullRequest {
  const { repository: repoOverrides, author, ...rest } = overrides;

  const nameWithOwner = repoOverrides?.nameWithOwner ?? 'acme/app';
  const [derivedOwner, derivedName] = nameWithOwner.includes('/')
    ? nameWithOwner.split('/')
    : ['acme', nameWithOwner];

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
    author: author === undefined ? { login: 'bot', avatarUrl: '' } : author,
    labels: null,
    repository: {
      id: repoOverrides?.id ?? 'repo',
      name: repoOverrides?.name ?? derivedName,
      nameWithOwner,
      owner: {
        login: repoOverrides?.owner?.login ?? derivedOwner,
      },
    },
    ...rest,
  };
}
