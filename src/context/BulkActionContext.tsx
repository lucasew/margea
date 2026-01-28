import { useState, useCallback, ReactNode } from 'react';
import { PullRequest, BulkActionType } from '../types';
import { BulkActionsService } from '../services/bulkActions';
import {
  BulkActionContext,
  BulkActionOperation,
} from './BulkActionContextValue';

export function BulkActionProvider({ children }: { children: ReactNode }) {
  const [operations, setOperations] = useState<BulkActionOperation[]>([]);
  const [isGlobalModalOpen, setIsGlobalModalOpen] = useState(false);
  const [activeModalOperationId, setActiveModalOperationId] = useState<
    string | null
  >(null);

  const startBulkAction = useCallback(
    async (prs: PullRequest[], type: BulkActionType) => {
      const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const initialProgress = prs.map((pr) => ({
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
        timestamp: Date.now(),
      };

      setOperations((prev) => [...prev, newOperation]);

      // We keep modal closed by default to support the toast workflow
      setIsGlobalModalOpen(false);

      await BulkActionsService.executeBulkAction(prs, type, (newProgress) => {
        setOperations((prev) =>
          prev.map((op) =>
            op.id === operationId ? { ...op, progress: newProgress } : op,
          ),
        );
      });

      setOperations((prev) =>
        prev.map((op) =>
          op.id === operationId ? { ...op, isExecuting: false } : op,
        ),
      );
    },
    [],
  );

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

  const dismissOperation = useCallback(
    (operationId: string) => {
      setOperations((prev) => prev.filter((op) => op.id !== operationId));
      if (activeModalOperationId === operationId) {
        setActiveModalOperationId(null);
        setIsGlobalModalOpen(false);
      }
    },
    [activeModalOperationId],
  );

  const clearState = useCallback(
    (operationId?: string) => {
      if (operationId) {
        dismissOperation(operationId);
      } else {
        setOperations([]);
        setActiveModalOperationId(null);
        setIsGlobalModalOpen(false);
      }
    },
    [dismissOperation],
  );

  return (
    <BulkActionContext.Provider
      value={{
        operations,
        startBulkAction,
        isGlobalModalOpen,
        activeModalOperationId,
        openGlobalModal,
        closeGlobalModal,
        minimizeGlobalModal,
        clearState,
        dismissOperation,
      }}
    >
      {children}
    </BulkActionContext.Provider>
  );
}
