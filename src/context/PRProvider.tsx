import { ReactNode, useEffect } from 'react';
import { useRelayEnvironment } from 'react-relay';
import { PRContext } from './PRContext';
import { PRContextType } from '../types';
import { prStore, isLoading, isFetchingNextPage } from '../services/prStore';
import { usePRStore, prActions } from '../hooks/usePRStore';

interface PRProviderProps {
  children: ReactNode;
}

/**
 * Thin wrapper that bridges the external PRStore into React context.
 *
 * All state lives in the store singleton; this component only:
 * 1. Injects the Relay environment into the store on mount.
 * 2. Subscribes to the store via useSyncExternalStore (through usePRStore).
 * 3. Provides the existing PRContextType shape for backward compatibility.
 */
export function PRProvider({ children }: PRProviderProps) {
  const environment = useRelayEnvironment();

  useEffect(() => {
    prStore.setEnvironment(environment);
  }, [environment]);

  const snapshot = usePRStore();

  const contextValue: PRContextType = {
    prMap: snapshot.prMap,
    pageInfo: {
      endCursor: null,
      hasNextPage: snapshot.hasNextPage,
    },
    isLoading: isLoading(snapshot.phase),
    isFetchingNextPage: isFetchingNextPage(snapshot.phase),
    searchQuery: snapshot.searchQuery,
    error: snapshot.error,
    setSearchQuery: prActions.setSearchQuery,
    setSearchScopes: prActions.setSearchScopes,
    loadNextPage: prActions.loadNextPage,
    refresh: prActions.refresh,
    optimisticUpdate: prActions.optimisticUpdate,
    removePR: prActions.removePR,
  };

  return (
    <PRContext.Provider value={contextValue}>{children}</PRContext.Provider>
  );
}
