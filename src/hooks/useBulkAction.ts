import { useContext } from 'react';
import { BulkActionContext } from '../context/BulkActionContext';

export function useBulkAction() {
  const context = useContext(BulkActionContext);
  if (context === undefined) {
    throw new Error('useBulkAction must be used within a BulkActionProvider');
  }
  return context;
}
