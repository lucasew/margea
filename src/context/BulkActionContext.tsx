import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { PullRequest, BulkActionType, BulkActionProgress } from '../types';
import { BulkActionsService } from '../services/bulkActions';

export interface BulkActionOperation {
  id: string;
  type: BulkActionType;
  progress: BulkActionProgress[];
  isExecuting: boolean;
  timestamp: number;
}

interface BulkActionContextType {
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

const BulkActionContext = createContext<BulkActionContextType | undefined>(undefined);

export function BulkActionProvider({ children }: { children: ReactNode }) {
  const [operations, setOperations] = useState<BulkActionOperation[]>([]);
  const [isGlobalModalOpen, setIsGlobalModalOpen] = useState(false);
  const [activeModalOperationId, setActiveModalOperationId] = useState<string | null>(null);

  const startBulkAction = useCallback(async (prs: PullRequest[], type: BulkActionType) => {
    const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const initialProgress = prs.map(pr => ({
      prId: pr.id,
      prNumber: pr.number,
      prTitle: pr.title,
      status: 'pending' as const,
    }));

    const newOperation: BulkActionOperation = {
      id: operationId,
      type,
      progress: initialProgress,
      isExecuting: true,
      timestamp: Date.now()
    };

    setOperations(prev => [...prev, newOperation]);

    // We keep modal closed by default to support the toast workflow
    setIsGlobalModalOpen(false);

    await BulkActionsService.executeBulkAction(prs, type, (newProgress) => {
      setOperations(prev => prev.map(op =>
        op.id === operationId
          ? { ...op, progress: newProgress }
          : op
      ));
    });

    setOperations(prev => prev.map(op =>
      op.id === operationId
        ? { ...op, isExecuting: false }
        : op
    ));
  }, []);

  const openGlobalModal = (operationId?: string) => {
    if (operationId) {
      setActiveModalOperationId(operationId);
    } else if (!activeModalOperationId && operations.length > 0) {
        // If no ID provided and no active ID, default to the most recent one
        // or the one that is executing.
        // Let's pick the last one added.
        setActiveModalOperationId(operations[operations.length - 1].id);
    }
    setIsGlobalModalOpen(true);
  };

  const closeGlobalModal = () => setIsGlobalModalOpen(false);
  const minimizeGlobalModal = () => setIsGlobalModalOpen(false);

  const dismissOperation = useCallback((operationId: string) => {
    setOperations(prev => prev.filter(op => op.id !== operationId));
    if (activeModalOperationId === operationId) {
        setActiveModalOperationId(null);
        setIsGlobalModalOpen(false);
    }
  }, [activeModalOperationId]);

  const clearState = useCallback((operationId?: string) => {
      if (operationId) {
          dismissOperation(operationId);
      } else {
          setOperations([]);
          setActiveModalOperationId(null);
          setIsGlobalModalOpen(false);
      }
  }, [dismissOperation]);

  return (
    <BulkActionContext.Provider value={{
      operations,
      startBulkAction,
      isGlobalModalOpen,
      activeModalOperationId,
      openGlobalModal,
      closeGlobalModal,
      minimizeGlobalModal,
      clearState,
      dismissOperation
    }}>
      {children}
    </BulkActionContext.Provider>
  );
}

export function useBulkAction() {
  const context = useContext(BulkActionContext);
  if (context === undefined) {
    throw new Error('useBulkAction must be used within a BulkActionProvider');
  }
  return context;
}
