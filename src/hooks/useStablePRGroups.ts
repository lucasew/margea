import { useState, useMemo } from 'react';
import { PullRequest, PRGroup, GroupingStrategy, SortStrategy } from '../types';
import { DEFAULT_SORT_STRATEGY } from '../constants';
import { groupPullRequests } from '../services/prGrouping';
import { sortGroups } from '../services/prSort';

/**
 * A hook that groups Pull Requests but maintains a stable order of groups
 * to prevent UI jumping ("teleportation") when new data is loaded (Infinite Scroll).
 *
 * Behavior:
 * 1. When `filterKey` changes (e.g. user changes filters or sort), it resets to the
 *    strategy-sorted order.
 * 2. When `prs` updates (e.g. loading more pages), existing groups stay in their
 *    current position. New groups are appended in strategy order among newcomers.
 */
export function useStablePRGroups(
  prs: PullRequest[],
  filterKey: string,
  groupingStrategy: GroupingStrategy = 'renovate',
  sortStrategy: SortStrategy = DEFAULT_SORT_STRATEGY,
): PRGroup[] {
  const [orderedKeys, setOrderedKeys] = useState<string[]>([]);
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);

  const freshGroups = useMemo(
    () => sortGroups(groupPullRequests(prs, groupingStrategy), sortStrategy),
    [prs, groupingStrategy, sortStrategy],
  );

  const freshGroupsMap = useMemo(() => {
    return new Map(freshGroups.map((g) => [g.key, g]));
  }, [freshGroups]);

  // Adjust state during render if filterKey changes (Pattern: Derived State)
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    const newKeys = freshGroups.map((g) => g.key);
    setOrderedKeys(newKeys);
    // React restarts render here.
  }

  // Determine the stable order
  const stableGroups = useMemo(() => {
    const result: PRGroup[] = [];
    const seenKeys = new Set<string>();

    // 1. Maintain order of existing keys
    for (const key of orderedKeys) {
      const group = freshGroupsMap.get(key);
      if (group) {
        result.push(group);
        seenKeys.add(key);
      }
    }

    // 2. Append new groups at the end
    for (const group of freshGroups) {
      if (!seenKeys.has(group.key)) {
        result.push(group);
        seenKeys.add(group.key);
      }
    }

    return result;
  }, [freshGroups, freshGroupsMap, orderedKeys]);

  // Sync state if new groups were added (Render Phase Update)
  // This ensures orderedKeys includes the newly discovered groups for future stability
  const currentKeys = stableGroups.map((g) => g.key);
  if (
    currentKeys.length !== orderedKeys.length ||
    !currentKeys.every((k, i) => k === orderedKeys[i])
  ) {
    setOrderedKeys(currentKeys);
    // React restarts render here.
  }

  return stableGroups;
}
