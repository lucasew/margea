import { createContext, useContext } from 'react';
import { PRContextType } from '../types';

export const PRContext = createContext<PRContextType | undefined>(undefined);

export function usePRContext() {
  const context = useContext(PRContext);
  if (!context) {
    throw new Error('usePRContext must be used within a PRProvider');
  }
  return context;
}
