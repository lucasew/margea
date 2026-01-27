import { createContext } from 'react';
import { BulkActionContextType } from '../types';

export const BulkActionContext = createContext<BulkActionContextType | undefined>(
  undefined,
);
