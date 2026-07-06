import { createContext } from 'react';
import {
  PullRequest,
  BulkActionType,
  BulkActionOperation,
  ConfirmBulkActionOptions,
} from '../types';
import type { PendingBulkAction } from '../services/bulkProgress';

export interface BulkActionContextType {
  operations: BulkActionOperation[];
  pendingConfirmation: PendingBulkAction | null;
  isModalOpen: boolean;
  activeOperationId: string | null;
  /** Open confirm dialog for a set of PRs. */
  requestBulkAction: (prs: PullRequest[], type: BulkActionType) => void;
  confirmPendingAction: (options?: ConfirmBulkActionOptions) => void;
  cancelPendingAction: () => void;
  openOperationModal: (operationId: string) => void;
  closeModal: () => void;
  dismissOperation: (operationId: string) => void;
}

export const BulkActionContext = createContext<
  BulkActionContextType | undefined
>(undefined);
