import { useState, useCallback, ReactNode } from 'react';
import { PullRequest, BulkActionType, BulkActionOperation } from '../types';
import { BulkActionsService } from '../services/bulkActions';
import {
  createBulkOperationId,
  toPendingProgress,
  type PendingBulkAction,
} from '../services/bulkProgress';
import { BulkActionContext } from './BulkActionContext';
import { usePRContext } from './PRContext';

export function BulkActionProvider({ children }: { children: ReactNode }) {
  const { optimisticUpdate } = usePRContext();
  const [operations, setOperations] = useState<BulkActionOperation[]>([]);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingBulkAction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeOperationId, setActiveOperationId] = useState<string | null>(
    null,
  );

  const requestBulkAction = useCallback(
    (prs: PullRequest[], type: BulkActionType) => {
      if (prs.length === 0) return;
      setPendingConfirmation({
        prs,
        type,
        progress: toPendingProgress(prs),
      });
      setActiveOperationId(null);
      setIsModalOpen(true);
    },
    [],
  );

  const cancelPendingAction = useCallback(() => {
    setPendingConfirmation(null);
    setIsModalOpen(false);
  }, []);

  const runOperation = useCallback(
    async (prs: PullRequest[], type: BulkActionType) => {
      const operationId = createBulkOperationId();
      const newOperation: BulkActionOperation = {
        id: operationId,
        type,
        progress: toPendingProgress(prs),
        isExecuting: true,
        timestamp: Date.now(),
      };

      setOperations((prev) => [...prev, newOperation]);
      setActiveOperationId(operationId);

      await BulkActionsService.executeBulkAction(
        prs,
        type,
        (newProgress) => {
          setOperations((prev) =>
            prev.map((op) =>
              op.id === operationId ? { ...op, progress: newProgress } : op,
            ),
          );
        },
        (result) => {
          if (result.success && result.updatedFields) {
            optimisticUpdate(result.prId, result.updatedFields);
          }
        },
      );

      setOperations((prev) =>
        prev.map((op) =>
          op.id === operationId ? { ...op, isExecuting: false } : op,
        ),
      );
    },
    [optimisticUpdate],
  );

  const confirmPendingAction = useCallback(() => {
    if (!pendingConfirmation) return;
    const { prs, type } = pendingConfirmation;
    setPendingConfirmation(null);
    // Hand off to toast workflow; user can re-open details from the toast.
    setIsModalOpen(false);
    setActiveOperationId(null);
    void runOperation(prs, type);
  }, [pendingConfirmation, runOperation]);

  const openOperationModal = useCallback((operationId: string) => {
    setPendingConfirmation(null);
    setActiveOperationId(operationId);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setPendingConfirmation(null);
  }, []);

  const dismissOperation = useCallback(
    (operationId: string) => {
      setOperations((prev) => prev.filter((op) => op.id !== operationId));
      if (activeOperationId === operationId) {
        setActiveOperationId(null);
        setIsModalOpen(false);
      }
    },
    [activeOperationId],
  );

  return (
    <BulkActionContext.Provider
      value={{
        operations,
        pendingConfirmation,
        isModalOpen,
        activeOperationId,
        requestBulkAction,
        confirmPendingAction,
        cancelPendingAction,
        openOperationModal,
        closeModal,
        dismissOperation,
      }}
    >
      {children}
    </BulkActionContext.Provider>
  );
}
