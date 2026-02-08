import { PullRequest } from '../types';

/**
 * Calculates aggregate statistics for a given set of Pull Requests.
 *
 * This function uses a single-pass reduction for efficiency, avoiding multiple
 * iterations over the PR array. It computes counts by state (Open, Merged, Closed)
 * and determines the number of unique repositories involved.
 *
 * @param prs - The list of Pull Requests to analyze.
 * @returns An object containing:
 *  - `total`: Total number of PRs.
 *  - `open`: Count of open PRs.
 *  - `merged`: Count of merged PRs.
 *  - `closed`: Count of closed (but not merged) PRs.
 *  - `repositories`: Count of unique repositories represented in the list.
 */
export function calculateStats(prs: PullRequest[]) {
  const initialStats = {
    open: 0,
    merged: 0,
    closed: 0,
    repos: new Set<string>(),
  };

  const stats = prs.reduce((acc, pr) => {
    if (pr.state === 'OPEN') acc.open++;
    else if (pr.state === 'MERGED') acc.merged++;
    else if (pr.state === 'CLOSED') acc.closed++;

    acc.repos.add(pr.repository.nameWithOwner);
    return acc;
  }, initialStats);

  return {
    total: prs.length,
    open: stats.open,
    merged: stats.merged,
    closed: stats.closed,
    repositories: stats.repos.size,
  };
}
