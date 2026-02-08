import { PullRequest } from '../types';
import { PRState } from '../constants';

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

  if (filters.repository) {
    filtered = filtered.filter((pr) =>
      pr.repository.nameWithOwner
        .toLowerCase()
        .includes(filters.repository!.toLowerCase()),
    );
  }

  if (filters.state && filters.state !== 'ALL') {
    filtered = filtered.filter((pr) => pr.state === filters.state);
  }

  if (filters.author) {
    filtered = filtered.filter((pr) =>
      pr.author?.login.toLowerCase().includes(filters.author!.toLowerCase()),
    );
  }

  if (filters.owner) {
    filtered = filtered.filter((pr) =>
      pr.repository.owner.login
        .toLowerCase()
        .includes(filters.owner!.toLowerCase()),
    );
  }

  return filtered;
}
