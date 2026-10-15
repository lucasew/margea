import { PullRequest } from '../types';
import type { SearchPRsQuery as SearchPRsQueryType } from '../queries/__generated__/SearchPRsQuery.graphql';

// This is the type for a single Pull Request node from the GraphQL query
type PRNodeType = NonNullable<
  NonNullable<SearchPRsQueryType['response']['search']['edges']>[number]
>['node'];

/**
 * GraphQL fragment fields that must be present for transformPR to produce a
 * PullRequest. Mirrors the runtime checks in isValidPR so the compiler can
 * narrow after the guard instead of relying on non-null assertions.
 */
type ValidPRNode = NonNullable<PRNodeType> &
  Required<
    Pick<
      NonNullable<PRNodeType>,
      | 'id'
      | 'number'
      | 'title'
      | 'state'
      | 'createdAt'
      | 'updatedAt'
      | 'url'
      | 'baseRefName'
      | 'headRefName'
      | 'repository'
    >
  >;

function isValidPR(pr: PRNodeType): pr is ValidPRNode {
  return Boolean(
    pr &&
    pr.id &&
    pr.number != null &&
    pr.title &&
    pr.state &&
    pr.createdAt &&
    pr.updatedAt &&
    pr.url &&
    pr.baseRefName &&
    pr.headRefName &&
    pr.repository?.owner?.login,
  );
}

function getCIStatus(pr: NonNullable<PRNodeType>): PullRequest['ciStatus'] {
  const state = pr.commits?.nodes?.[0]?.commit?.statusCheckRollup?.state;
  if (state === 'SUCCESS') return 'SUCCESS';
  if (state === 'FAILURE' || state === 'ERROR') return 'FAILURE';
  if (state === 'PENDING' || state === 'EXPECTED') return 'PENDING';
  return null;
}

export function transformPR(pr: PRNodeType): PullRequest | null {
  if (!isValidPR(pr)) {
    return null;
  }

  return {
    id: pr.id,
    number: pr.number,
    title: pr.title,
    body: pr.body ?? null,
    state: pr.state as 'OPEN' | 'CLOSED' | 'MERGED',
    additions: pr.additions ?? 0,
    deletions: pr.deletions ?? 0,
    ciStatus: getCIStatus(pr),
    createdAt: pr.createdAt,
    updatedAt: pr.updatedAt,
    mergedAt: pr.mergedAt ?? null,
    closedAt: pr.closedAt ?? null,
    url: pr.url,
    baseRefName: pr.baseRefName,
    headRefName: pr.headRefName,
    author: pr.author
      ? {
          login: pr.author.login,
          avatarUrl: pr.author.avatarUrl,
        }
      : null,
    labels: pr.labels
      ? {
          nodes: (pr.labels.nodes || [])
            .filter((node): node is NonNullable<typeof node> => node != null)
            .map((node) => ({
              id: node.id,
              name: node.name,
              color: node.color,
              description: node.description ?? null,
            })),
        }
      : null,
    repository: pr.repository,
  };
}
