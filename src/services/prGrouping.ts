import { PullRequest, PRGroup } from '../types';

/**
 * Extract package name from PR title
 * Examples:
 * - "Update dependency react to v18.2.0" -> "react"
 * - "chore(deps): update react monorepo" -> "react"
 * - "Update @types/node to v20.0.0" -> "@types/node"
 */
function extractPackageName(title: string): string {
  // Common patterns for Renovate PRs
  const patterns = [
    /Update dependency (@?[\w-\/]+)/i,
    /Update (@?[\w-\/]+) to/i,
    /chore\(deps\): update (@?[\w-\/]+)/i,
    /Update (@?[\w-\/]+) monorepo/i,
    /^(@?[\w-\/]+):/,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Fallback: use first word
  const firstWord = title.split(/\s+/)[0];
  return firstWord || 'unknown';
}

/**
 * Group PRs by package name, base branch, and labels
 */
export function groupPullRequests(prs: PullRequest[]): PRGroup[] {
  const groups = new Map<string, PRGroup>();

  for (const pr of prs) {
    const packageName = extractPackageName(pr.title);
    const baseRef = pr.baseRefName;
    const labels = pr.labels?.nodes?.map(l => l.name).sort() || [];
    const labelsKey = labels.join(',');

    const key = `${packageName}|${baseRef}|${labelsKey}`;

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        package: packageName,
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

  // Sort groups by count (descending) and then by package name
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
