import { PullRequest, PRGroup } from '../types';

/**
 * Extract package name from PR title
 * Examples:
 * - "Update dependency react to v18.2.0" -> "react"
 * - "chore(deps): update react monorepo" -> "react"
 * - "Update @types/node to v20.0.0" -> "@types/node"
 * - "fix(deps): update module tailscale.com to v1.90.5" -> "tailscale.com"
 * - "Update actions/upload-artifact action to v5" -> "actions/upload-artifact"
 */
function extractPackageName(title: string): string {
  // Remove conventional commit prefixes like "fix(deps):", "chore(deps):", etc.
  const cleanTitle = title.replace(/^(fix|chore|feat|docs|style|refactor|perf|test|build|ci|revert)\([^)]*\):\s*/i, '');

  // Common patterns for Renovate PRs
  const patterns = [
    // "Update dependency <package>" or "update module <package>"
    /update (?:dependency|module) (@?[\w\-./]+)/i,
    // "Update <package> to vX.X.X" or "Update <package> action to vX.X.X"
    /update (@?[\w\-./]+(?:\/[\w\-./]+)*)(?:\s+(?:action|monorepo))?\s+to\s+v?[\d.]+/i,
    // "Update <package> monorepo"
    /update (@?[\w\-./]+(?:\/[\w\-./]+)*) monorepo/i,
    // Generic "update <package>"
    /update (@?[\w\-./]+(?:\/[\w\-./]+)*)/i,
  ];

  for (const pattern of patterns) {
    const match = cleanTitle.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Fallback: use first word
  const firstWord = cleanTitle.split(/\s+/)[0];
  return firstWord || 'unknown';
}

/**
 * Group PRs by package name, base branch, labels, and author
 */
export function groupPullRequests(prs: PullRequest[]): PRGroup[] {
  const groups = new Map<string, PRGroup>();

  for (const pr of prs) {
    const packageName = extractPackageName(pr.title);
    const baseRef = pr.baseRefName;
    const labels = pr.labels?.nodes?.map(l => l.name).sort() || [];
    const labelsKey = labels.join(',');
    const author = pr.author?.login || 'unknown';

    const key = `${packageName}|${baseRef}|${labelsKey}|${author}`;

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

  // Sort groups by author, then count (descending), then package name
  return Array.from(groups.values()).sort((a, b) => {
    const authorA = a.prs[0]?.author?.login || 'unknown';
    const authorB = b.prs[0]?.author?.login || 'unknown';

    if (authorA !== authorB) {
      return authorA.localeCompare(authorB);
    }

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
