import { PullRequest, PRGroup } from '../types';

/**
 * Normalize base ref to group main and master together
 */
function normalizeBaseRef(baseRef: string): string {
  return baseRef === 'master' ? 'main' : baseRef;
}

/**
 * Group PRs by title, author, base branch (main=master), and labels
 */
export function groupPullRequests(prs: PullRequest[]): PRGroup[] {
  const groups = new Map<string, PRGroup>();

  for (const pr of prs) {
    const title = pr.title;
    const author = pr.author?.login || 'unknown';
    const baseRef = normalizeBaseRef(pr.baseRefName);
    const labels = pr.labels?.nodes?.map(l => l.name).sort() || [];
    const labelsKey = labels.join(',');

    const key = `${title}|${author}|${baseRef}|${labelsKey}`;

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        package: title,
        baseRef,
        labels,
        prs: [],
        count: 0,
      });
    }

    const group = groups.get(key)!;
    group.prs.push(pr);
    group.count++;
  }

  // Sort groups by count (descending), then title
  return Array.from(groups.values()).sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.package.localeCompare(b.package);
  });
}

/**
 * Filter PRs based on criteria
 */
export function filterPullRequests(
  prs: PullRequest[],
  filters: {
    repository?: string;
    state?: 'OPEN' | 'CLOSED' | 'MERGED' | 'ALL';
    author?: string;
    owner?: string;
  }
): PullRequest[] {
  let filtered = [...prs];

  if (filters.repository) {
    filtered = filtered.filter(pr =>
      pr.repository.nameWithOwner.toLowerCase().includes(filters.repository!.toLowerCase())
    );
  }

  if (filters.state && filters.state !== 'ALL') {
    filtered = filtered.filter(pr => pr.state === filters.state);
  }

  if (filters.author) {
    filtered = filtered.filter(pr =>
      pr.author?.login.toLowerCase().includes(filters.author!.toLowerCase())
    );
  }

  if (filters.owner) {
    filtered = filtered.filter(pr =>
      pr.repository.owner.login.toLowerCase().includes(filters.owner!.toLowerCase())
    );
  }

  return filtered;
}

/**
 * Calculate statistics for PRs
 */
export function calculateStats(prs: PullRequest[]) {
  return {
    total: prs.length,
    open: prs.filter(pr => pr.state === 'OPEN').length,
    merged: prs.filter(pr => pr.state === 'MERGED').length,
    closed: prs.filter(pr => pr.state === 'CLOSED').length,
    repositories: new Set(prs.map(pr => pr.repository.nameWithOwner)).size,
  };
}
