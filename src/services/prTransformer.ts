import { PullRequest } from '../types';
import type { SearchPRsQuery as SearchPRsQueryType } from '../queries/__generated__/SearchPRsQuery.graphql';

// This is the type for a single Pull Request node from the GraphQL query
type PRNodeType = NonNullable<
  NonNullable<SearchPRsQueryType['response']['search']['edges']>[number]
>['node'];

/**
 * Checks if the PR node has all required fields to be safely used in the application.
 *
 * This function is critical for runtime safety because the GraphQL type definitions
 * might imply non-nullability for some fields that could be missing in practice,
 * especially when queries are updated or if there are permissions issues.
 *
 * @param pr - The raw PR node from the GraphQL response.
 * @returns `true` if all essential fields are present, `false` otherwise.
 */
function isValidPR(pr: PRNodeType): boolean {
  if (
    !pr ||
    !pr.id ||
    pr.number == null ||
    !pr.title ||
    !pr.state ||
    !pr.createdAt ||
    !pr.updatedAt ||
    !pr.url ||
    !pr.baseRefName ||
    !pr.headRefName ||
    !pr.repository ||
    !pr.repository.owner ||
    !pr.repository.owner.login
  ) {
    return false;
  }
  return true;
}

/**
 * Extracts the CI status from the PR node.
 */
function getCIStatus(pr: NonNullable<PRNodeType>): PullRequest['ciStatus'] {
  const state = pr.commits?.nodes?.[0]?.commit?.statusCheckRollup?.state;
  if (state === 'SUCCESS') return 'SUCCESS';
  if (state === 'FAILURE' || state === 'ERROR') return 'FAILURE';
  if (state === 'PENDING' || state === 'EXPECTED') return 'PENDING';
  return null;
}

/**
 * Transforms a raw GraphQL Pull Request node into the application's internal `PullRequest` model.
 *
 * This transformation layer serves several purposes:
 * 1. **Validation**: Ensures only complete and valid PR objects reach the UI components.
 * 2. **Normalization**: Converts nullable GraphQL fields (like `additions`, `deletions`) into
 *    safe defaults (e.g., `0`) to simplify consumption.
 * 3. **Type Safety**: Bridges the gap between the complex, often-nested GraphQL types
 *    and the flatter, stricter internal TypeScript interfaces.
 *
 * @param pr - The raw pull request node from the GraphQL query response.
 * @returns A validated and normalized `PullRequest` object, or `null` if the input
 *          failed validation (`isValidPR`).
 */
export function transformPR(pr: PRNodeType): PullRequest | null {
  if (!isValidPR(pr)) {
    return null;
  }

  // We use non-null assertion (!) here because `isValidPR` has already guaranteed
  // that these specific fields are present and not null.
  return {
    id: pr!.id!,
    number: pr!.number!,
    title: pr!.title!,
    body: pr!.body ?? null,
    state: pr!.state as 'OPEN' | 'CLOSED' | 'MERGED',
    additions: pr!.additions ?? 0,
    deletions: pr!.deletions ?? 0,
    ciStatus: getCIStatus(pr!),
    createdAt: pr!.createdAt!,
    updatedAt: pr!.updatedAt!,
    mergedAt: pr!.mergedAt ?? null,
    closedAt: pr!.closedAt ?? null,
    url: pr!.url!,
    baseRefName: pr!.baseRefName!,
    headRefName: pr!.headRefName!,
    author: pr!.author
      ? {
          login: pr!.author.login,
          avatarUrl: pr!.author.avatarUrl,
        }
      : null,
    labels: pr!.labels
      ? {
          nodes: (pr!.labels.nodes || [])
            .filter((node): node is NonNullable<typeof node> => node != null)
            .map((node) => ({
              id: node.id,
              name: node.name,
              color: node.color,
              description: node.description ?? null,
            })),
        }
      : null,
    repository: pr!.repository!,
  };
}
