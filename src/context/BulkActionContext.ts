import { createContext } from 'react';
import { PullRequest, BulkActionType, BulkActionOperation } from '../types';

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
