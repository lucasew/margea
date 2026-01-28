import { createContext } from 'react';
import { BulkActionOperation, BulkActionType, PullRequest } from '../types';

export interface BulkActionContextType {
  // Legacy support for single operation (optional, or we can deprecate/remove if we update all consumers)
  // To avoid breaking changes immediately, we can map these to the "latest" operation or "active" one.
  // But strictly speaking, if we change the return type of useBulkAction, we MUST update all consumers.
  // Given the limited number of consumers (Toast, Modal, PRGroupDetail), it is better to update them.

  operations: BulkActionOperation[];
  startBulkAction: (prs: PullRequest[], type: BulkActionType) => Promise<void>;

  // Modal handling
  isGlobalModalOpen: boolean;
  activeModalOperationId: string | null;
  openGlobalModal: (operationId?: string) => void;
  closeGlobalModal: () => void;
  minimizeGlobalModal: () => void;

  // State management
  clearState: (operationId?: string) => void;
  dismissOperation: (operationId: string) => void;

  // Helpers for backward compatibility or ease of use (optional)
  // For now let's expose the operations list.
}

export const BulkActionContext = createContext<BulkActionContextType | undefined>(undefined);
