import { PullRequest } from '../types';
import { PRState } from '../constants';

function matchesFilter(
  value: string | undefined,
  query: string | undefined,
): boolean {
  if (!query) return true;
  return value ? value.toLowerCase().includes(query.toLowerCase()) : false;
}

export function filterPullRequests(
  prs: PullRequest[],
  filters: {
    repository?: string;
    state?: PRState;
    author?: string;
    owner?: string;
  },
): PullRequest[] {
  return prs.filter(
    (pr) =>
      (!filters.state ||
        filters.state === 'ALL' ||
        pr.state === filters.state) &&
      matchesFilter(pr.repository.nameWithOwner, filters.repository) &&
      matchesFilter(pr.author?.login, filters.author) &&
      matchesFilter(pr.repository.owner.login, filters.owner),
  );
}
