import { PullRequest, PRGroup, GroupingStrategy } from '../types';

function normalizeBaseRef(baseRef: string): string {
  return baseRef === 'master' ? 'main' : baseRef;
}

function deduplicatePRs(prs: PullRequest[]): PullRequest[] {
  const uniquePrs = new Map<string, PullRequest>();
  for (const pr of prs) {
    if (!uniquePrs.has(pr.url)) {
      uniquePrs.set(pr.url, pr);
    }
  }
  return Array.from(uniquePrs.values());
}

function normalizeTitle(title: string): string {
  if (title.startsWith('Update dependency')) {
    return title.replace('Update dependency', 'chore(deps): update dependency');
  }
  return title;
}

type GroupingFunction = (prs: PullRequest[]) => PRGroup[];

function groupByHelper(
  prs: PullRequest[],
  keyExtractor: (pr: PullRequest) => { key: string; groupName: string },
): PRGroup[] {
  const groups = new Map<string, PRGroup>();
  const uniquePrs = deduplicatePRs(prs);

  for (const pr of uniquePrs) {
    const { key, groupName } = keyExtractor(pr);

    let group = groups.get(key);
    if (group === undefined) {
      const baseRef = normalizeBaseRef(pr.baseRefName);
      const labels = pr.labels?.nodes?.map((l) => l.name).sort() || [];

      group = {
        key,
        package: groupName,
        baseRef,
        labels,
        prs: [],
        count: 0,
      };
      groups.set(key, group);
    }

    group.prs.push(pr);
    group.count++;
  }

  return Array.from(groups.values());
}

function groupByLabel(labelOf: (pr: PullRequest) => string): GroupingFunction {
  return (prs) =>
    groupByHelper(prs, (pr) => {
      const groupName = labelOf(pr);
      return { key: groupName, groupName };
    });
}

const groupRenovate: GroupingFunction = (prs) =>
  groupByHelper(prs, (pr) => {
    const title = normalizeTitle(pr.title);
    const author = pr.author?.login || 'unknown';
    return { key: `${title}|${author}`, groupName: title };
  });

const groupRepository = groupByLabel((pr) => pr.repository.nameWithOwner);

const groupAuthor = groupByLabel((pr) => pr.author?.login || 'unknown');

const groupAgents = groupByLabel((pr) => {
  const firstRune = [...pr.title.trim()][0];
  if (
    firstRune &&
    /^\p{Emoji}$/u.test(firstRune) &&
    firstRune.codePointAt(0)! > 255
  ) {
    return firstRune;
  }
  return '(No emoji)';
});

const STRATEGY_HANDLERS: Record<GroupingStrategy, GroupingFunction> = {
  renovate: groupRenovate,
  repository: groupRepository,
  author: groupAuthor,
  agents: groupAgents,
};

export function groupPullRequests(
  prs: PullRequest[],
  strategy: GroupingStrategy = 'renovate',
): PRGroup[] {
  const handler = STRATEGY_HANDLERS[strategy] || STRATEGY_HANDLERS.renovate;
  return handler(prs);
}
