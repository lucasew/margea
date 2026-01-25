import { PullRequest, PRGroup } from '../types';
import { PRState } from '../constants';

/**
 * Normalize base ref to group main and master together
 */
function normalizeBaseRef(baseRef: string): string {
  return baseRef === 'master' ? 'main' : baseRef;
}

/**
 * Deduplicate PRs by permalink (url).
 * Uses a Map to ensure unique URLs, keeping the first occurrence.
 */
function deduplicatePRs(prs: PullRequest[]): PullRequest[] {
  const uniquePrs = new Map<string, PullRequest>();
  for (const pr of prs) {
    if (!uniquePrs.has(pr.url)) {
      uniquePrs.set(pr.url, pr);
    }
  }
  return Array.from(uniquePrs.values());
}

/**
 * Normalizes the PR title for grouping.
 * Currently replaces 'Update dependency' with 'chore(deps): update dependency'.
 */
function normalizeTitle(title: string): string {
  if (title.startsWith('Update dependency')) {
    return title.replace('Update dependency', 'chore(deps): update dependency');
  }
  return title;
}

/**
 * Creates a unique key for grouping PRs.
 * Grouping is based on Title + Author (Creator).
 */
function createGroupingKey(title: string, author: string): string {
  return `${title}|${author}`;
}

/**
 * Group PRs by title and author (creator) only.
 * Deduplicates PRs by permalink (url).
 */
export function groupPullRequests(prs: PullRequest[]): PRGroup[] {
  const groups = new Map<string, PRGroup>();
  const uniquePrs = deduplicatePRs(prs);

  for (const pr of uniquePrs) {
    const title = normalizeTitle(pr.title);
    const author = pr.author?.login || 'unknown';
    const key = createGroupingKey(title, author);

    if (!groups.has(key)) {
      // Base ref and labels are no longer part of the grouping key,
      // but we still capture them for display (taking from the first PR in the group).
      const baseRef = normalizeBaseRef(pr.baseRefName);
      const labels = pr.labels?.nodes?.map(l => l.name).sort() || [];

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
    state?: PRState;
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
 * Calculate statistics for PRs using a single pass reduction.
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
