import { DEFAULT_SORT_STRATEGY, SORT_STRATEGIES } from '../constants';
import type { PRGroup, PullRequest, SortStrategy } from '../types';
import { parseAllowed } from '../utils/parseAllowed';
import { countCiStatuses } from './ciStatus';

function isSortStrategy(value: string): value is SortStrategy {
  return Object.prototype.hasOwnProperty.call(SORT_STRATEGIES, value);
}

export function parseSortStrategy(
  value: string | null | undefined,
): SortStrategy {
  return parseAllowed(value, isSortStrategy, DEFAULT_SORT_STRATEGY);
}

function extremeTimestamp(
  prs: PullRequest[],
  field: 'updatedAt' | 'createdAt',
  mode: 'min' | 'max',
): number {
  let best = mode === 'min' ? Number.POSITIVE_INFINITY : 0;
  for (const pr of prs) {
    const time = Date.parse(pr[field]);
    if (Number.isNaN(time)) continue;
    if (mode === 'min' ? time < best : time > best) best = time;
  }
  return best === Number.POSITIVE_INFINITY ? 0 : best;
}

function countRepos(prs: PullRequest[]): number {
  return new Set(prs.map((pr) => pr.repository.nameWithOwner)).size;
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
          extremeTimestamp(a.prs, 'updatedAt', 'max'),
          extremeTimestamp(b.prs, 'updatedAt', 'max'),
        );
        break;
      case 'oldest':
        primary = compareAsc(
          extremeTimestamp(a.prs, 'updatedAt', 'min'),
          extremeTimestamp(b.prs, 'updatedAt', 'min'),
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
          extremeTimestamp(a.prs, 'createdAt', 'max'),
          extremeTimestamp(b.prs, 'createdAt', 'max'),
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
