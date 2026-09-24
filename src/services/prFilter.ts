import { PullRequest } from '../types';
import { PRState } from '../constants';

/**
 * Keep PRs whose picked text contains `query` (case-insensitive).
 * An empty query is inactive. A missing value does not match.
 */
function filterByIncludes(
  prs: PullRequest[],
  query: string | undefined,
  pick: (pr: PullRequest) => string | null | undefined,
): PullRequest[] {
  if (!query) return prs;
  const needle = query.toLowerCase();
  return prs.filter((pr) => {
    const value = pick(pr);
    return value != null && value.toLowerCase().includes(needle);
  });
}

/**
 * Filters a list of Pull Requests based on a set of criteria.
 *
 * Filtering is additive (AND logic): a PR must match ALL provided non-empty filters to be included.
 * String comparisons for Repository, Author, and Owner are case-insensitive.
 *
 * @param prs - The source list of Pull Requests.
 * @param filters - An object containing optional filter criteria:
 *  - `repository`: Partial match on `repository.nameWithOwner`.
 *  - `state`: Exact match on PR state (OPEN, MERGED, CLOSED) or 'ALL'.
 *  - `author`: Partial match on `author.login`.
 *  - `owner`: Partial match on `repository.owner.login`.
 * @returns A new array containing only the PRs that satisfy all active filters.
 */
export function filterPullRequests(
  prs: PullRequest[],
  filters: {
    repository?: string;
    state?: PRState;
    author?: string;
    owner?: string;
  },
): PullRequest[] {
  let filtered = [...prs];

  filtered = filterByIncludes(
    filtered,
    filters.repository,
    (pr) => pr.repository.nameWithOwner,
  );

  if (filters.state && filters.state !== 'ALL') {
    const state = filters.state;
    filtered = filtered.filter((pr) => pr.state === state);
  }

  filtered = filterByIncludes(
    filtered,
    filters.author,
    (pr) => pr.author?.login,
  );

  filtered = filterByIncludes(
    filtered,
    filters.owner,
    (pr) => pr.repository.owner.login,
  );

  return filtered;
}
