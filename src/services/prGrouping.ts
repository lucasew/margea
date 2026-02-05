import { PullRequest, PRGroup, GroupingStrategy } from '../types';
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

type GroupingFunction = (prs: PullRequest[]) => PRGroup[];

/**
 * Generic grouping helper that groups PRs based on a key extraction function.
 */
function groupByHelper(
  prs: PullRequest[],
  keyExtractor: (pr: PullRequest) => { key: string; groupName: string },
): PRGroup[] {
  const groups = new Map<string, PRGroup>();
  const uniquePrs = deduplicatePRs(prs);

  for (const pr of uniquePrs) {
    const { key, groupName } = keyExtractor(pr);

    if (!groups.has(key)) {
      const baseRef = normalizeBaseRef(pr.baseRefName);
      const labels = pr.labels?.nodes?.map((l) => l.name).sort() || [];

      groups.set(key, {
        key,
        package: groupName,
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
 * Grouping Strategy: Renovate (Default)
 * Groups by Title + Author.
 */
const groupRenovate: GroupingFunction = (prs) => {
  return groupByHelper(prs, (pr) => {
    const title = normalizeTitle(pr.title);
    const author = pr.author?.login || 'unknown';
    const key = createGroupingKey(title, author);
    return { key, groupName: title };
  });
};

/**
 * Grouping Strategy: Repository
 * Groups by Repository Name (owner/name).
 */
const groupRepository: GroupingFunction = (prs) => {
  return groupByHelper(prs, (pr) => {
    const name = pr.repository.nameWithOwner;
    return { key: name, groupName: name };
  });
};

/**
 * Grouping Strategy: Author
 * Groups by Author Login.
 */
const groupAuthor: GroupingFunction = (prs) => {
  return groupByHelper(prs, (pr) => {
    const login = pr.author?.login || 'unknown';
    return { key: login, groupName: login };
  });
};

const STRATEGY_HANDLERS: Record<GroupingStrategy, GroupingFunction> = {
  renovate: groupRenovate,
  repository: groupRepository,
  author: groupAuthor,
};

/**
 * Groups Pull Requests based on the provided strategy.
 *
 * @param prs - The list of Pull Requests to group.
 * @param strategy - The strategy to use for grouping.
 * @returns An array of `PRGroup` objects, sorted by relevance.
 */
export function groupPullRequests(
  prs: PullRequest[],
  strategy: GroupingStrategy = 'renovate',
): PRGroup[] {
  const handler = STRATEGY_HANDLERS[strategy] || STRATEGY_HANDLERS.renovate;
  return handler(prs);
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
