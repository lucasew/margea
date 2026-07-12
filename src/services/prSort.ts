import { DEFAULT_SORT_STRATEGY, SORT_STRATEGIES } from '../constants';
import type { PRGroup, PullRequest, SortStrategy } from '../types';
import { countCiStatuses } from './ciStatus';

function isSortStrategy(value: string): value is SortStrategy {
  return Object.prototype.hasOwnProperty.call(SORT_STRATEGIES, value);
}

export function parseSortStrategy(
  value: string | null | undefined,
): SortStrategy {
  if (value && isSortStrategy(value)) return value;
  return DEFAULT_SORT_STRATEGY;
}

function maxTimestamp(
  prs: PullRequest[],
  field: 'updatedAt' | 'createdAt',
): number {
  let max = 0;
  for (const pr of prs) {
    const time = Date.parse(pr[field]);
    if (!Number.isNaN(time) && time > max) max = time;
  }
  return max;
}

function minTimestamp(
  prs: PullRequest[],
  field: 'updatedAt' | 'createdAt',
): number {
  let min = Number.POSITIVE_INFINITY;
  for (const pr of prs) {
    const time = Date.parse(pr[field]);
    if (!Number.isNaN(time) && time < min) min = time;
  }
  return min === Number.POSITIVE_INFINITY ? 0 : min;
}

function countRepos(prs: PullRequest[]): number {
  const repos = new Set<string>();
  for (const pr of prs) {
    repos.add(pr.repository.nameWithOwner);
  }
  return repos.size;
}

function compareByName(a: PRGroup, b: PRGroup): number {
  return a.package.localeCompare(b.package);
}

function compareDesc(a: number, b: number): number {
  return b - a;
}

function compareAsc(a: number, b: number): number {
  return a - b;
}

/**
 * Sorts PR groups by the selected strategy. Ties break on package name A–Z.
 */
export function sortGroups(
  groups: PRGroup[],
  strategy: SortStrategy = DEFAULT_SORT_STRATEGY,
): PRGroup[] {
  const sorted = [...groups];

  sorted.sort((a, b) => {
    let primary = 0;

    switch (strategy) {
      case 'count':
        primary = compareDesc(a.count, b.count);
        break;
      case 'updated':
        primary = compareDesc(
          maxTimestamp(a.prs, 'updatedAt'),
          maxTimestamp(b.prs, 'updatedAt'),
        );
        break;
      case 'oldest':
        primary = compareAsc(
          minTimestamp(a.prs, 'updatedAt'),
          minTimestamp(b.prs, 'updatedAt'),
        );
        break;
      case 'name':
        return compareByName(a, b);
      case 'ci_failures':
        primary = compareDesc(
          countCiStatuses(a.prs).failure,
          countCiStatuses(b.prs).failure,
        );
        break;
      case 'repos':
        primary = compareDesc(countRepos(a.prs), countRepos(b.prs));
        break;
      case 'created':
        primary = compareDesc(
          maxTimestamp(a.prs, 'createdAt'),
          maxTimestamp(b.prs, 'createdAt'),
        );
        break;
      default:
        primary = compareDesc(a.count, b.count);
    }

    if (primary !== 0) return primary;
    return compareByName(a, b);
  });

  return sorted;
}
