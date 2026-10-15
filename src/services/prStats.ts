import { PullRequest } from '../types';

export type PRStats = {
  total: number;
  open: number;
  merged: number;
  closed: number;
  repositories: number;
};

export function calculateStats(prs: PullRequest[]): PRStats {
  let open = 0;
  let merged = 0;
  let closed = 0;
  const repos = new Set<string>();

  for (const pr of prs) {
    if (pr.state === 'OPEN') open++;
    else if (pr.state === 'MERGED') merged++;
    else if (pr.state === 'CLOSED') closed++;
    repos.add(pr.repository.nameWithOwner);
  }

  return {
    total: prs.length,
    open,
    merged,
    closed,
    repositories: repos.size,
  };
}
