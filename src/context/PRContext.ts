import { createContext } from 'react';
import { PRContextType } from '../types';
import { useRequiredContext } from '../utils/useRequiredContext';

export const PRContext = createContext<PRContextType | undefined>(undefined);

export function usePRContext() {
  return useRequiredContext(
    PRContext,
    'usePRContext must be used within a PRProvider',
  );
}
