import { useSyncExternalStore, useCallback } from 'react';
import {
  prStore,
  PRStoreState,
  FetchPhase,
  isLoading as phaseIsLoading,
  isFetchingNextPage as phaseIsFetchingNextPage,
  isBusy as phaseIsBusy,
} from '../services/prStore';

/**
 * Primary hook – returns the full store snapshot.
 * Components re-render only when the snapshot reference changes.
 */
export function usePRStore(): PRStoreState {
  return useSyncExternalStore(prStore.subscribe, prStore.getSnapshot);
}

/**
 * Returns only the current FSM phase.
 * Useful for the speed-dial button and other status indicators.
 */
export function useFetchPhase(): FetchPhase {
  const selector = useCallback(() => prStore.getSnapshot().phase, []);
  return useSyncExternalStore(prStore.subscribe, selector);
}

/**
 * Convenience: backward-compatible boolean selectors derived from phase.
 */
export function usePRLoading(): boolean {
  const phase = useFetchPhase();
  return phaseIsLoading(phase);
}

export function usePRFetchingNextPage(): boolean {
  const phase = useFetchPhase();
  return phaseIsFetchingNextPage(phase);
}

export function usePRBusy(): boolean {
  const phase = useFetchPhase();
  return phaseIsBusy(phase);
}

/**
 * Actions – stable references, safe to pass as props without memoization.
 */
export const prActions = {
  loadNextPage: () => prStore.loadNextPage(),
  refresh: () => prStore.refresh(),
  setSearchScopes: (scopes: string[]) => prStore.setSearchScopes(scopes),
  setSearchQuery: (query: string) => prStore.setSearchQuery(query),
  optimisticUpdate: (prId: string, changes: Partial<import('../types').PullRequest>) =>
    prStore.optimisticUpdate(prId, changes),
  removePR: (prId: string) => prStore.removePR(prId),
} as const;
