import { createContext, useContext } from 'react';
import { PullRequest, BulkActionType, BulkActionProgress } from '../types';

export interface BulkActionOperation {
  id: string;
  type: BulkActionType;
  progress: BulkActionProgress[];
  isExecuting: boolean;
  timestamp: number;
}

export interface BulkActionContextType {
  operations: BulkActionOperation[];
  startBulkAction: (prs: PullRequest[], type: BulkActionType) => Promise<void>;
  isGlobalModalOpen: boolean;
  activeModalOperationId: string | null;
  openGlobalModal: (operationId?: string) => void;
  closeGlobalModal: () => void;
  minimizeGlobalModal: () => void;
  clearState: (operationId?: string) => void;
  dismissOperation: (operationId: string) => void;
}

export const BulkActionContext = createContext<
  BulkActionContextType | undefined
>(undefined);

export function useBulkAction() {
  const context = useContext(BulkActionContext);
  if (context === undefined) {
    throw new Error('useBulkAction must be used within a BulkActionProvider');
  }
  return context;
}
