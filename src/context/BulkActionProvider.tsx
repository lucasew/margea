import { useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import {
  PullRequest,
  BulkActionType,
  BulkActionOperation,
  ConfirmBulkActionOptions,
  MergeMethod,
} from '../types';
import { BulkActionsService } from '../services/bulkActions';
import {
  createBulkOperationId,
  toPendingProgress,
  type PendingBulkAction,
} from '../services/bulkProgress';
import {
  readStoredMergeMethod,
  storeMergeMethod,
} from '../services/mergeMethod';
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
  const pendingConfirmationRef = useRef<PendingBulkAction | null>(null);

  useEffect(() => {
    pendingConfirmationRef.current = pendingConfirmation;
  }, [pendingConfirmation]);

  const requestBulkAction = useCallback(
    (prs: PullRequest[], type: BulkActionType) => {
      if (prs.length === 0) return;
      const pending = {
        prs,
        type,
        progress: toPendingProgress(prs),
      };
      pendingConfirmationRef.current = pending;
      setPendingConfirmation(pending);
      setActiveOperationId(null);
      setIsModalOpen(true);
    },
    [],
  );

  const cancelPendingAction = useCallback(() => {
    pendingConfirmationRef.current = null;
    setPendingConfirmation(null);
    setIsModalOpen(false);
  }, []);

  const runOperation = useCallback(
    async (
      prs: PullRequest[],
      type: BulkActionType,
      mergeMethod?: MergeMethod,
    ) => {
      if (prs.length === 0) return;

      const resolvedMergeMethod =
        type === 'merge' ? (mergeMethod ?? readStoredMergeMethod()) : undefined;

      if (resolvedMergeMethod) {
        storeMergeMethod(resolvedMergeMethod);
      }

      const operationId = createBulkOperationId();
      const newOperation: BulkActionOperation = {
        id: operationId,
        type,
        progress: toPendingProgress(prs),
        isExecuting: true,
        timestamp: Date.now(),
        mergeMethod: resolvedMergeMethod,
      };

      // Toast workflow: keep the detail modal closed until the user re-opens it.
      setOperations((prev) => [...prev, newOperation]);

      try {
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
          resolvedMergeMethod
            ? { mergeMethod: resolvedMergeMethod }
            : undefined,
        );
      } finally {
        setOperations((prev) =>
          prev.map((op) =>
            op.id === operationId ? { ...op, isExecuting: false } : op,
          ),
        );
      }
    },
    [optimisticUpdate],
  );

  const confirmPendingAction = useCallback(
    (options?: ConfirmBulkActionOptions) => {
      const pending = pendingConfirmationRef.current;
      if (!pending) return;

      const { prs, type } = pending;
      pendingConfirmationRef.current = null;
      setPendingConfirmation(null);
      // Hand off to toast workflow; user can re-open details from the toast.
      setIsModalOpen(false);
      setActiveOperationId(null);
      void runOperation(prs, type, options?.mergeMethod);
    },
    [runOperation],
  );

  const openOperationModal = useCallback((operationId: string) => {
    pendingConfirmationRef.current = null;
    setPendingConfirmation(null);
    setActiveOperationId(operationId);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    pendingConfirmationRef.current = null;
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
