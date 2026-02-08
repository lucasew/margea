import { PullRequest, PRGroup, GroupingStrategy } from '../types';

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
